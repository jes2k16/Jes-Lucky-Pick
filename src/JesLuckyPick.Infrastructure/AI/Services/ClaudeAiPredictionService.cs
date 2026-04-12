using System.Diagnostics;
using System.Text.Json;
using JesLuckyPick.Application.Common.Interfaces;
using JesLuckyPick.Application.Features.Predictions.DTOs;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;
using Microsoft.Extensions.Configuration;

namespace JesLuckyPick.Infrastructure.AI.Services;

public class ClaudeAiPredictionService(IAppSettingRepository settingRepo, IConfiguration configuration) : IAiPredictionService
{
    private const string KeyModel = "Ai:Model";
    private const string KeyIsEnabled = "Ai:IsEnabled";
    private const string DefaultModel = "claude-sonnet-4-20250514";

    private string ResolveClaudePath()
    {
        // Trust the configured path without File.Exists() — IIS app pool identity
        // may lack permissions to stat files under another user's profile.
        var configured = configuration["Ai:ClaudePath"];
        if (!string.IsNullOrWhiteSpace(configured))
            return configured;

        if (OperatingSystem.IsWindows())
        {
            // Check npm global install location
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var cmdPath = Path.Combine(appData, "npm", "claude.cmd");
            if (File.Exists(cmdPath)) return cmdPath;

            // Check common node install paths
            var programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            var nodePath = Path.Combine(programFiles, "nodejs", "claude.cmd");
            if (File.Exists(nodePath)) return nodePath;
        }

        return "claude";
    }

    private ProcessStartInfo CreateClaudeStartInfo(params string[] args)
    {
        var psi = new ProcessStartInfo
        {
            FileName = ResolveClaudePath(),
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        foreach (var arg in args)
            psi.ArgumentList.Add(arg);

        return psi;
    }

    public async Task<bool> IsConfiguredAsync(CancellationToken ct = default)
    {
        var enabled = await settingRepo.GetByKeyAsync(KeyIsEnabled, ct);
        if (enabled is null || !string.Equals(enabled.Value, "true", StringComparison.OrdinalIgnoreCase))
            return false;

        // Check if claude CLI is available
        try
        {
            using var process = new Process();
            process.StartInfo = CreateClaudeStartInfo("--version");
            process.Start();
            await process.WaitForExitAsync(ct);
            return process.ExitCode == 0;
        }
        catch
        {
            return false;
        }
    }

    public async Task<PredictionResponse> GeneratePredictionAsync(
        IReadOnlyList<Draw> historicalDraws, CancellationToken ct = default)
    {
        var modelSetting = await settingRepo.GetByKeyAsync(KeyModel, ct);
        var model = modelSetting?.Value ?? DefaultModel;

        var systemPrompt =
            "You are a lottery number prediction assistant for PCSO 6/42 Lotto. " +
            "Analyze the provided historical draw data and suggest 6 unique numbers between 1 and 42. " +
            "You MUST respond with ONLY a valid JSON object in this exact format, no other text: " +
            "{\"numbers\": [n1, n2, n3, n4, n5, n6], \"confidence\": 50, \"reasoning\": \"your analysis\"} " +
            "Numbers must be in ascending order. Confidence is 1-100.";

        var userPrompt = BuildPrompt(historicalDraws);

        var fullPrompt = $"{systemPrompt}\n\n{userPrompt}";

        using var process = new Process();
        process.StartInfo = CreateClaudeStartInfo("-p", fullPrompt, "--model", model);

        process.Start();

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(120));

        var output = await process.StandardOutput.ReadToEndAsync(timeoutCts.Token);
        await process.WaitForExitAsync(timeoutCts.Token);

        if (process.ExitCode != 0)
        {
            var error = await process.StandardError.ReadToEndAsync(ct);
            throw new InvalidOperationException($"Claude CLI failed (exit {process.ExitCode}): {error}");
        }

        return ParseResponse(output.Trim(), model);
    }

    private static readonly Dictionary<string, string> ModelDisplayNames = new()
    {
        ["claude-sonnet-4-20250514"] = "Sonnet 4",
        ["claude-opus-4-20250514"] = "Opus 4",
        ["claude-haiku-4-5-20251001"] = "Haiku 4.5",
    };

    private static string BuildPrompt(IReadOnlyList<Draw> draws)
    {
        // Frequency analysis
        var freq = new Dictionary<int, int>();
        for (var i = 1; i <= 42; i++) freq[i] = 0;
        foreach (var draw in draws)
            foreach (var num in draw.GetNumbers())
                freq[num]++;

        var topFrequent = freq.OrderByDescending(kv => kv.Value).Take(10)
            .Select(kv => $"{kv.Key} ({kv.Value}x)");

        var leastFrequent = freq.OrderBy(kv => kv.Value).Take(10)
            .Select(kv => $"{kv.Key} ({kv.Value}x)");

        // Recent draws
        var recent = draws.TakeLast(20).Reverse()
            .Select(d => $"  {d.DrawDate:yyyy-MM-dd}: {string.Join("-", d.GetNumbers())}");

        // Gap analysis
        var gaps = Enumerable.Range(1, 42).Select(num =>
        {
            for (var i = draws.Count - 1; i >= 0; i--)
                if (draws[i].GetNumbers().Contains((short)num))
                    return (Number: num, Gap: draws.Count - 1 - i);
            return (Number: num, Gap: draws.Count);
        }).OrderByDescending(g => g.Gap).Take(10)
          .Select(g => $"{g.Number} (gap: {g.Gap})");

        return $"""
            Analyze {draws.Count} historical PCSO 6/42 Lotto draws and pick 6 numbers.

            TOP 10 MOST FREQUENT NUMBERS:
            {string.Join(", ", topFrequent)}

            TOP 10 LEAST FREQUENT NUMBERS:
            {string.Join(", ", leastFrequent)}

            LAST 20 DRAWS:
            {string.Join("\n", recent)}

            TOP 10 MOST OVERDUE NUMBERS (longest gap since last appearance):
            {string.Join(", ", gaps)}

            Based on your analysis of frequency patterns, recent trends, and gap analysis,
            suggest 6 numbers for the next draw. Respond with JSON only.
            """;
    }

    private static PredictionResponse ParseResponse(string content, string modelId)
    {
        // Try to extract JSON from the response
        var jsonStart = content.IndexOf('{');
        var jsonEnd = content.LastIndexOf('}');
        if (jsonStart < 0 || jsonEnd < 0)
            throw new InvalidOperationException("AI response did not contain valid JSON.");

        var json = content[jsonStart..(jsonEnd + 1)];

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var numbers = root.GetProperty("numbers")
            .EnumerateArray()
            .Select(e => (short)e.GetInt32())
            .OrderBy(n => n)
            .ToArray();

        if (numbers.Length != 6 || numbers.Any(n => n < 1 || n > 42) || numbers.Distinct().Count() != 6)
            throw new InvalidOperationException("AI returned invalid numbers.");

        var confidence = root.TryGetProperty("confidence", out var confEl)
            ? (decimal)confEl.GetInt32()
            : 70m;

        var reasoning = root.TryGetProperty("reasoning", out var reasonEl)
            ? reasonEl.GetString() ?? "AI-generated prediction based on historical analysis."
            : "AI-generated prediction based on historical analysis.";

        var displayName = ModelDisplayNames.GetValueOrDefault(modelId, modelId);
        var prefixedReasoning = $"[Model: {displayName}] {reasoning}";

        return new PredictionResponse(numbers, confidence, "ClaudeAi", prefixedReasoning);
    }
}
