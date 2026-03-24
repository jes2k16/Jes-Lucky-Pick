using System.Security.Claims;
using JesLuckyPick.Application.Features.Profile.DTOs;
using JesLuckyPick.Domain.Interfaces;

namespace JesLuckyPick.Api.Endpoints;

public static class ProfileEndpoints
{
    private const int MaxAvatarSizeBytes = 2 * 1024 * 1024; // 2MB

    public static void MapProfileEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/profile").RequireAuthorization();

        group.MapGet("/", async (IUserRepository userRepo, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var u = await userRepo.GetByIdAsync(userId);
            if (u is null) return Results.NotFound();

            return Results.Ok(new ProfileResponse(
                u.Id, u.Username, u.Email,
                u.FirstName, u.LastName, u.PhoneNumber, u.Bio,
                u.ProfilePictureBase64));
        });

        group.MapPut("/", async (
            UpdateProfileRequest request,
            IUserRepository userRepo,
            ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var u = await userRepo.GetByIdAsync(userId);
            if (u is null) return Results.NotFound();

            u.FirstName = request.FirstName ?? u.FirstName;
            u.LastName = request.LastName ?? u.LastName;
            u.PhoneNumber = request.PhoneNumber ?? u.PhoneNumber;
            u.Bio = request.Bio ?? u.Bio;
            u.UpdatedAt = DateTime.UtcNow;

            await userRepo.UpdateAsync(u);

            return Results.Ok(new ProfileResponse(
                u.Id, u.Username, u.Email,
                u.FirstName, u.LastName, u.PhoneNumber, u.Bio,
                u.ProfilePictureBase64));
        });

        group.MapPost("/avatar", async (
            UploadAvatarRequest request,
            IUserRepository userRepo,
            ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var u = await userRepo.GetByIdAsync(userId);
            if (u is null) return Results.NotFound();

            // Validate size (base64 is ~33% larger than raw bytes)
            var estimatedBytes = request.Base64Image.Length * 3 / 4;
            if (estimatedBytes > MaxAvatarSizeBytes)
                return Results.BadRequest(new { message = "Image must be smaller than 2MB." });

            u.ProfilePictureBase64 = request.Base64Image;
            u.UpdatedAt = DateTime.UtcNow;
            await userRepo.UpdateAsync(u);

            return Results.Ok(new { profilePictureBase64 = u.ProfilePictureBase64 });
        });

        group.MapDelete("/avatar", async (
            IUserRepository userRepo,
            ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var u = await userRepo.GetByIdAsync(userId);
            if (u is null) return Results.NotFound();

            u.ProfilePictureBase64 = null;
            u.UpdatedAt = DateTime.UtcNow;
            await userRepo.UpdateAsync(u);

            return Results.Ok(new { message = "Avatar removed." });
        });
    }
}
