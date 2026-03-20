using JesLuckyPick.Application.Common.Interfaces;
using JesLuckyPick.Application.Features.Auth.DTOs;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Enums;
using JesLuckyPick.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JesLuckyPick.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher) : ControllerBase
{
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var (items, totalCount) = await userRepository.GetPagedAsync(page, pageSize, ct);
        return Ok(new
        {
            items = items.Select(u => new UserDto(u.Id, u.Username, u.Email, u.Role.ToString())),
            totalCount,
            page,
            pageSize
        });
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser(
        [FromBody] CreateUserRequest request, CancellationToken ct)
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
            Role = Enum.Parse<UserRole>(request.Role, ignoreCase: true),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await userRepository.AddAsync(user, ct);
        return Ok(new UserDto(user.Id, user.Username, user.Email, user.Role.ToString()));
    }

    [HttpPut("users/{id:guid}")]
    public async Task<IActionResult> UpdateUser(
        Guid id, [FromBody] UpdateUserRequest request, CancellationToken ct)
    {
        var user = await userRepository.GetByIdAsync(id, ct);
        if (user is null) return NotFound();

        user.Email = request.Email ?? user.Email;
        user.Role = request.Role is not null
            ? Enum.Parse<UserRole>(request.Role, ignoreCase: true)
            : user.Role;
        user.IsActive = request.IsActive ?? user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(request.Password))
        {
            var (hash, salt) = passwordHasher.HashPassword(request.Password);
            user.PasswordHash = hash;
            user.PasswordSalt = salt;
        }

        await userRepository.UpdateAsync(user, ct);
        return Ok(new UserDto(user.Id, user.Username, user.Email, user.Role.ToString()));
    }

    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id, CancellationToken ct)
    {
        var user = await userRepository.GetByIdAsync(id, ct);
        if (user is null) return NotFound();

        await userRepository.DeleteAsync(id, ct);
        return NoContent();
    }
}

public record CreateUserRequest(string Username, string Email, string Password, string Role = "User");
public record UpdateUserRequest(string? Email, string? Password, string? Role, bool? IsActive);
