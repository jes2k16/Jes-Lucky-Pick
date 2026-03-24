using System.Security.Cryptography;
using JesLuckyPick.Application.Common.Interfaces;
using JesLuckyPick.Application.Features.Auth.DTOs;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Enums;
using JesLuckyPick.Domain.Interfaces;
using JesLuckyPick.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JesLuckyPick.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    ITokenService tokenService,
    AppDbContext dbContext) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request, CancellationToken ct)
    {
        if (await userRepository.GetByUsernameAsync(request.Username, ct) is not null)
            return BadRequest(new { message = "Username already exists." });

        if (await userRepository.GetByEmailAsync(request.Email, ct) is not null)
            return BadRequest(new { message = "Email already exists." });

        var (hash, salt) = passwordHasher.HashPassword(request.Password);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            Email = request.Email,
            PasswordHash = hash,
            PasswordSalt = salt,
            Role = UserRole.User,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await userRepository.AddAsync(user, ct);
        return Ok(new { message = "Registration successful." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request, CancellationToken ct)
    {
        var user = await userRepository.GetByUsernameAsync(request.Username, ct);
        if (user is null || !user.IsActive)
            return Unauthorized(new { message = "Invalid credentials." });

        if (!passwordHasher.VerifyPassword(request.Password, user.PasswordHash, user.PasswordSalt))
            return Unauthorized(new { message = "Invalid credentials." });

        var accessToken = tokenService.GenerateAccessToken(user);
        var refreshToken = tokenService.GenerateRefreshToken();

        var hashedRefresh = Convert.ToBase64String(
            SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(refreshToken)));

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = hashedRefresh,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        });
        user.LastLoginAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(ct);

        SetRefreshTokenCookie(refreshToken);

        return Ok(new LoginResponse(
            accessToken,
            new UserDto(user.Id, user.Username, user.Email, user.Role.ToString(), user.ProfilePictureBase64, user.FirstName, user.LastName, user.PhoneNumber, user.Bio)));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized(new { message = "No refresh token." });

        var hashedToken = Convert.ToBase64String(
            SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(refreshToken)));

        var storedToken = await dbContext.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == hashedToken && rt.RevokedAt == null, ct);

        if (storedToken is null || storedToken.IsExpired)
            return Unauthorized(new { message = "Invalid or expired refresh token." });

        // Rotate: revoke old, issue new
        storedToken.RevokedAt = DateTime.UtcNow;

        var newRefreshToken = tokenService.GenerateRefreshToken();
        var newHashedRefresh = Convert.ToBase64String(
            SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(newRefreshToken)));

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = storedToken.UserId,
            Token = newHashedRefresh,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync(ct);

        SetRefreshTokenCookie(newRefreshToken);

        var user = storedToken.User;
        var accessToken = tokenService.GenerateAccessToken(user);
        return Ok(new LoginResponse(
            accessToken,
            new UserDto(user.Id, user.Username, user.Email, user.Role.ToString(),
                user.ProfilePictureBase64, user.FirstName, user.LastName,
                user.PhoneNumber, user.Bio)));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (!string.IsNullOrEmpty(refreshToken))
        {
            var hashedToken = Convert.ToBase64String(
                SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(refreshToken)));

            var storedToken = await dbContext.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.Token == hashedToken && rt.RevokedAt == null, ct);

            if (storedToken is not null)
            {
                storedToken.RevokedAt = DateTime.UtcNow;
                await dbContext.SaveChangesAsync(ct);
            }
        }

        Response.Cookies.Delete("refreshToken");
        return Ok(new { message = "Logged out." });
    }

    private void SetRefreshTokenCookie(string token)
    {
        Response.Cookies.Append("refreshToken", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(7),
            Path = "/api/auth"
        });
    }
}
