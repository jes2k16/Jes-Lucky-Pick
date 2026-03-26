using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace JesLuckyPick.Api.Hubs;

[Authorize(Roles = "Admin")]
public class GameHub : Hub
{
    private static readonly ConcurrentDictionary<string, CancellationTokenSource> ActiveGames = new();

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

    /// <summary>
    /// Execute one AI expert turn: send prompt to Claude CLI, return parsed numbers.
    /// </summary>
    public async Task<int[]?> ExecuteExpertTurn(
        string personality,
        string model,
        int combinationSize,
        string numberRange,
        int roundNumber,
        int tryNumber,
        string confidenceMapJson,
        string tryHistoryJson)
    {
        var connectionId = Context.ConnectionId;

        // Load prompt template from DB
        var dbContext = Context.GetHttpContext()!.RequestServices.GetRequiredService<AppDbContext>();
        var prompt = await dbContext.AgentPrompts
            .FirstOrDefaultAsync(p => p.Role == "Expert" && p.Personality == personality && p.IsActive);

        if (prompt == null)
        {
            await Clients.Caller.SendAsync("GameError", $"No active prompt found for Expert/{personality}");
            return null;
        }

        // Fill placeholders
        var filledPrompt = prompt.SystemPrompt
            .Replace("{combinationSize}", combinationSize.ToString())
            .Replace("{numberRange}", numberRange)
            .Replace("{roundNumber}", roundNumber.ToString())
            .Replace("{tryNumber}", tryNumber.ToString())
            .Replace("{confidenceMap}", confidenceMapJson)
            .Replace("{tryHistory}", tryHistoryJson);

        var effectiveModel = string.IsNullOrEmpty(model) ? prompt.Model : model;

        // Run Claude CLI
        var output = await RunClaudePrompt(connectionId, filledPrompt, effectiveModel);
        if (output == null) return null;

        // Parse JSON array from output
        try
        {
            // Find first JSON array in the output
            var start = output.IndexOf('[');
            var end = output.LastIndexOf(']');
            if (start < 0 || end < 0) return null;

            var jsonArray = output.Substring(start, end - start + 1);
            var numbers = JsonSerializer.Deserialize<int[]>(jsonArray);
            return numbers;
        }
        catch
        {
            await Clients.Caller.SendAsync("GameError", $"Failed to parse AI response: {output[..Math.Min(200, output.Length)]}");
            return null;
        }
    }

    /// <summary>
    /// Execute one AI manager evaluation turn.
    /// </summary>
    public async Task<string?> ExecuteManagerTurn(
        string model,
        int combinationSize,
        string numberRange,
        int roundNumber,
        string expertResultsJson)
    {
        var connectionId = Context.ConnectionId;

        var dbContext = Context.GetHttpContext()!.RequestServices.GetRequiredService<AppDbContext>();
        var prompt = await dbContext.AgentPrompts
            .FirstOrDefaultAsync(p => p.Role == "Manager" && p.IsActive);

        if (prompt == null)
        {
            await Clients.Caller.SendAsync("GameError", "No active Manager prompt found");
            return null;
        }

        var filledPrompt = prompt.SystemPrompt
            .Replace("{combinationSize}", combinationSize.ToString())
            .Replace("{numberRange}", numberRange)
            .Replace("{roundNumber}", roundNumber.ToString())
            .Replace("{expertResults}", expertResultsJson);

        var effectiveModel = string.IsNullOrEmpty(model) ? prompt.Model : model;

        return await RunClaudePrompt(connectionId, filledPrompt, effectiveModel);
    }

    public Task CancelGame()
    {
        if (ActiveGames.TryRemove(Context.ConnectionId, out var cts))
        {
            cts.Cancel();
            cts.Dispose();
        }
        return Task.CompletedTask;
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        if (ActiveGames.TryRemove(Context.ConnectionId, out var cts))
        {
            cts.Cancel();
            cts.Dispose();
        }
        return base.OnDisconnectedAsync(exception);
    }

    private async Task<string?> RunClaudePrompt(string connectionId, string prompt, string model)
    {
        var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = ResolveClaudePath(),
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };

        process.StartInfo.ArgumentList.Add("-p");
        process.StartInfo.ArgumentList.Add(prompt);
        process.StartInfo.ArgumentList.Add("--model");
        process.StartInfo.ArgumentList.Add(model);

        try
        {
            process.Start();
            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync(Context.ConnectionAborted);

            if (process.ExitCode != 0 && !string.IsNullOrWhiteSpace(error))
            {
                await Clients.Caller.SendAsync("GameError", $"Claude CLI error: {error[..Math.Min(200, error.Length)]}");
                return null;
            }

            return output;
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("GameError", $"Process error: {ex.Message}");
            return null;
        }
        finally
        {
            process.Dispose();
        }
    }
}
