namespace JesLuckyPick.Application.Features.Settings.DTOs;

public record AiSettingsResponse(
    bool IsEnabled,
    string Model);

public record UpdateAiSettingsRequest(
    bool? IsEnabled,
    string? Model);

public record AiModelOption(string Id, string DisplayName);

public record AiTestResult(bool Success, string Message);
