namespace JesLuckyPick.Application.Features.Profile.DTOs;

public record ProfileResponse(
    Guid Id,
    string Username,
    string Email,
    string? FirstName,
    string? LastName,
    string? PhoneNumber,
    string? Bio,
    string? ProfilePictureBase64);

public record UpdateProfileRequest(
    string? FirstName,
    string? LastName,
    string? PhoneNumber,
    string? Bio);

public record UploadAvatarRequest(string Base64Image);
