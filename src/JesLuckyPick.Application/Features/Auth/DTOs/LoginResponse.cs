namespace JesLuckyPick.Application.Features.Auth.DTOs;

public record LoginResponse(string AccessToken, UserDto User);

public record UserDto(
    Guid Id, string Username, string Email, string Role,
    string? ProfilePictureBase64,
    string? FirstName = null, string? LastName = null,
    string? PhoneNumber = null, string? Bio = null);
