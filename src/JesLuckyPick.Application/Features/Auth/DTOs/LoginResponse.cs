namespace JesLuckyPick.Application.Features.Auth.DTOs;

public record LoginResponse(string AccessToken, UserDto User);

public record UserDto(Guid Id, string Username, string Email, string Role);
