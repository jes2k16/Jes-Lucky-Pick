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
            // npm global install (classic)
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var cmdPath = Path.Combine(appData, "npm", "claude.cmd");
            if (File.Exists(cmdPath)) return cmdPath;

            // VSCode extension bundled binary (claude.exe inside the installed extension)
            var userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            var extensionsDir = Path.Combine(userProfile, ".vscode", "extensions");
            if (Directory.Exists(extensionsDir))
            {
                var extensionDirs = Directory.GetDirectories(extensionsDir, "anthropic.claude-code-*");
                foreach (var dir in extensionDirs.OrderByDescending(d => d))
                {
                    var exePath = Path.Combine(dir, "resources", "native-binary", "claude.exe");
                    if (File.Exists(exePath)) return exePath;
                }
            }
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
        string tryHistoryJson,
        string careerContextJson = "")
    {
        var connectionId = Context.ConnectionId;

        // Create a new scope per invocation — DbContext is not thread-safe and concurrent
        // hub calls (MaximumParallelInvocationsPerClient > 1) would share the connection scope.
        var httpCtx = Context.GetHttpContext();
        if (httpCtx == null)
        {
            await Clients.Caller.SendAsync("GameError", "No HTTP context available");
            return null;
        }
        using var scope = httpCtx.RequestServices.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
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

        // Prepend career context for veteran experts
        if (!string.IsNullOrWhiteSpace(careerContextJson))
        {
            filledPrompt = careerContextJson + "\n\n" + filledPrompt;
        }

        var effectiveModel = string.IsNullOrEmpty(model) ? prompt.Model : model;

        // Run Claude CLI
        var output = await RunClaudePrompt(connectionId, filledPrompt, effectiveModel);
        if (output == null) return null;

        // Scan all [...] substrings and return the first that deserializes as int[]
        var searchFrom = 0;
        while (searchFrom < output.Length)
        {
            var start = output.IndexOf('[', searchFrom);
            if (start < 0) break;

            var end = output.IndexOf(']', start + 1);
            if (end < 0) break;

            try
            {
                var candidate = output.Substring(start, end - start + 1);
                var numbers = JsonSerializer.Deserialize<int[]>(candidate);
                if (numbers is { Length: > 0 })
                    return numbers;
            }
            catch { }

            searchFrom = start + 1;
        }

        await Clients.Caller.SendAsync("GameError", $"Failed to parse AI response: {output[..Math.Min(200, output.Length)]}");
        return null;
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

        var httpCtxMgr = Context.GetHttpContext();
        if (httpCtxMgr == null)
        {
            await Clients.Caller.SendAsync("GameError", "No HTTP context available");
            return null;
        }
        using var scope = httpCtxMgr.RequestServices.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
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

    /// <summary>
    /// Generate a one-line post-game lesson for an AI expert.
    /// Called after game ends to capture what the expert learned.
    /// </summary>
    public async Task<string?> GeneratePostGameLesson(
        string expertName,
        string personality,
        string model,
        int bestScore,
        string bestGuessJson,
        string secretComboJson,
        string matchedNumbersJson,
        string tryHistoryJson)
    {
        var connectionId = Context.ConnectionId;

        var prompt = $"""
            You just finished a lotto number guessing game as "{expertName}" (personality: {personality}).
            Your best try scored {bestScore}★ with {bestGuessJson}.
            The secret combination was {secretComboJson}. You matched: {matchedNumbersJson}.
            Your full try history this game: {tryHistoryJson}

            Write ONE sentence summarizing what you learned. Focus on which numbers
            showed promise and which were dead ends. Be specific and actionable
            for your future self. Output ONLY the lesson sentence, nothing else.
            """;

        var effectiveModel = string.IsNullOrEmpty(model) ? "claude-haiku-4-5-20251001" : model;
        var output = await RunClaudePrompt(connectionId, prompt, effectiveModel);

        return output?.Trim();
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
            // Read stdout and stderr concurrently — sequential reading can deadlock
            // if the process fills one buffer while we're blocked waiting on the other.
            var outputTask = process.StandardOutput.ReadToEndAsync();
            var errorTask = process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync(Context.ConnectionAborted);
            var output = await outputTask;
            var error = await errorTask;

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
