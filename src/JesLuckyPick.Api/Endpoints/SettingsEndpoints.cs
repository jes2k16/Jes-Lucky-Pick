using System.Diagnostics;
using System.Security.Claims;
using JesLuckyPick.Application.Features.Settings.DTOs;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;

namespace JesLuckyPick.Api.Endpoints;

public static class SettingsEndpoints
{
    private const string KeyModel = "Ai:Model";
    private const string KeyIsEnabled = "Ai:IsEnabled";

    public static void MapSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/settings")
            .RequireAuthorization(policy => policy.RequireRole("Admin"));

        group.MapGet("/ai", GetAiSettings);
        group.MapPut("/ai", UpdateAiSettings);
        group.MapGet("/ai/models", GetAvailableModels);
        group.MapPost("/ai/test", TestAiConnection);
    }

    private static async Task<IResult> GetAiSettings(
        IAppSettingRepository repo, CancellationToken ct)
    {
        var settings = await repo.GetByPrefixAsync("Ai:", ct);
        var dict = settings.ToDictionary(s => s.Key, s => s.Value);

        var isEnabled = dict.TryGetValue(KeyIsEnabled, out var enabledStr)
            && string.Equals(enabledStr, "true", StringComparison.OrdinalIgnoreCase);

        var model = dict.GetValueOrDefault(KeyModel, "claude-sonnet-4-20250514");

        return Results.Ok(new AiSettingsResponse(isEnabled, model));
    }

    private static async Task<IResult> UpdateAiSettings(
        UpdateAiSettingsRequest request,
        IAppSettingRepository repo,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var now = DateTime.UtcNow;

        if (request.IsEnabled.HasValue)
        {
            await repo.UpsertAsync(new AppSetting
            {
                Key = KeyIsEnabled,
                Value = request.IsEnabled.Value ? "true" : "false",
                UpdatedAt = now,
                UpdatedByUserId = userId
            }, ct);
        }

        if (!string.IsNullOrWhiteSpace(request.Model))
        {
            await repo.UpsertAsync(new AppSetting
            {
                Key = KeyModel,
                Value = request.Model,
                UpdatedAt = now,
                UpdatedByUserId = userId
            }, ct);
        }

        return Results.Ok(new { message = "AI settings updated successfully." });
    }

    private static IResult GetAvailableModels()
    {
        var models = new List<AiModelOption>
        {
            new("claude-sonnet-4-20250514", "Claude Sonnet 4 (Recommended)"),
            new("claude-opus-4-20250514", "Claude Opus 4"),
            new("claude-haiku-4-5-20251001", "Claude Haiku 4.5")
        };
        return Results.Ok(models);
    }

    private static string ResolveClaudePath()
    {
        if (OperatingSystem.IsWindows())
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var cmdPath = Path.Combine(appData, "npm", "claude.cmd");
            if (File.Exists(cmdPath)) return cmdPath;
        }

        return "claude";
    }

    private static async Task<IResult> TestAiConnection(
        IAppSettingRepository repo,
        CancellationToken ct)
    {
        try
        {
            var modelSetting = await repo.GetByKeyAsync(KeyModel, ct);
            var model = modelSetting?.Value ?? "claude-sonnet-4-20250514";

            using var process = new Process();
            process.StartInfo = new ProcessStartInfo
            {
                FileName = ResolveClaudePath(),
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            process.StartInfo.ArgumentList.Add("-p");
            process.StartInfo.ArgumentList.Add("Reply with only the word OK.");
            process.StartInfo.ArgumentList.Add("--model");
            process.StartInfo.ArgumentList.Add(model);

            process.Start();

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(30));

            var output = await process.StandardOutput.ReadToEndAsync(timeoutCts.Token);
            await process.WaitForExitAsync(timeoutCts.Token);

            if (process.ExitCode != 0)
            {
                var error = await process.StandardError.ReadToEndAsync(ct);
                return Results.Ok(new AiTestResult(false, $"CLI failed: {error}"));
            }

            return Results.Ok(new AiTestResult(true, $"Connection successful. Response: {output.Trim()}"));
        }
        catch (Exception ex)
        {
            return Results.Ok(new AiTestResult(false, $"Connection failed: {ex.Message}"));
        }
    }
}
