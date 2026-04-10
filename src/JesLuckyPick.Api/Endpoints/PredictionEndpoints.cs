using System.Diagnostics;
using System.Security.Claims;
using System.Text.Json;
using JesLuckyPick.Application.Features.Predictions.DTOs;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Enums;
using JesLuckyPick.Domain.Interfaces;
using JesLuckyPick.Infrastructure.AI.Services;

namespace JesLuckyPick.Api.Endpoints;

public static class PredictionEndpoints
{
    public static void MapPredictionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/predictions").RequireAuthorization();

        group.MapPost("/generate", async (
            PredictionRequest request,
            PredictionOrchestratorService orchestrator,
            ILottoGameRepository gameRepo,
            IPredictionRepository predictionRepo,
            ClaimsPrincipal user) =>
        {
            var game = await gameRepo.GetByCodeAsync(request.GameCode);
            if (game is null) return Results.NotFound("Game not found.");

            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var results = new List<PredictionResponse>();
            for (var i = 0; i < request.Count; i++)
            {
                var result = await orchestrator.GeneratePredictionAsync(
                    game.Id, request.Strategy);

                // Persist prediction
                var prediction = new Prediction
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    GameId = game.Id,
                    Strategy = Enum.Parse<PredictionStrategy>(request.Strategy, ignoreCase: true),
                    Number1 = result.Numbers[0],
                    Number2 = result.Numbers[1],
                    Number3 = result.Numbers[2],
                    Number4 = result.Numbers[3],
                    Number5 = result.Numbers[4],
                    Number6 = result.Numbers[5],
                    ConfidenceScore = result.ConfidenceScore,
                    Reasoning = result.Reasoning,
                    CreatedAt = DateTime.UtcNow
                };
                await predictionRepo.AddAsync(prediction);

                results.Add(result);
            }

            return Results.Ok(results);
        });

        group.MapPost("/save", async (
            SavePredictionRequest request,
            ILottoGameRepository gameRepo,
            IPredictionRepository predictionRepo,
            ClaimsPrincipal user) =>
        {
            var game = await gameRepo.GetByCodeAsync(request.GameCode);
            if (game is null) return Results.NotFound("Game not found.");

            if (request.Numbers.Length != 6)
                return Results.BadRequest("Exactly 6 numbers required.");

            if (!Enum.TryParse<PredictionStrategy>(request.Strategy, ignoreCase: true, out var strategy))
                return Results.BadRequest($"Unknown strategy: {request.Strategy}");

            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var prediction = new Prediction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                GameId = game.Id,
                Strategy = strategy,
                Number1 = (short)request.Numbers[0],
                Number2 = (short)request.Numbers[1],
                Number3 = (short)request.Numbers[2],
                Number4 = (short)request.Numbers[3],
                Number5 = (short)request.Numbers[4],
                Number6 = (short)request.Numbers[5],
                ConfidenceScore = request.ConfidenceScore,
                Reasoning = request.Reasoning,
                CreatedAt = DateTime.UtcNow,
            };
            await predictionRepo.AddAsync(prediction);

            var response = new PredictionResponse(
                prediction.GetNumbers(),
                prediction.ConfidenceScore,
                prediction.Strategy.ToString(),
                prediction.Reasoning);

            return Results.Ok(new[] { response });
        });

        group.MapGet("/", async (
            IPredictionRepository predictionRepo,
            IDrawRepository drawRepo,
            ClaimsPrincipal user,
            int page = 1,
            int pageSize = 20) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var (items, totalCount) = await predictionRepo.GetByUserPagedAsync(userId, page, pageSize);

            var historyItems = new List<PredictionHistoryItem>();
            foreach (var p in items)
            {
                var closestDraw = await drawRepo.GetFirstOnOrAfterDateAsync(p.GameId, p.CreatedAt);

                PredictionMatchInfo? matchInfo = null;
                if (closestDraw is not null)
                {
                    var predNums = p.GetNumbers().ToHashSet();
                    var drawNums = closestDraw.GetNumbers();
                    var matched = drawNums.Count(n => predNums.Contains(n));
                    matchInfo = new PredictionMatchInfo(
                        closestDraw.DrawDate, drawNums, matched,
                        Math.Round(matched / 6.0m * 100, 1));
                }

                historyItems.Add(new PredictionHistoryItem(
                    p.Id, p.GetNumbers(), p.ConfidenceScore,
                    p.Strategy.ToString(), p.Reasoning,
                    p.CreatedAt, matchInfo));
            }

            return Results.Ok(new
            {
                items = historyItems,
                totalCount,
                page,
                pageSize
            });
        });

        group.MapGet("/{id:guid}", async (Guid id, IPredictionRepository predictionRepo) =>
        {
            var prediction = await predictionRepo.GetByIdAsync(id);
            if (prediction is null) return Results.NotFound();

            return Results.Ok(new PredictionResponse(
                prediction.GetNumbers(), prediction.ConfidenceScore,
                prediction.Strategy.ToString(), prediction.Reasoning));
        });

        group.MapPost("/agent", async (
            AgentPredictionRequest request,
            ILottoGameRepository gameRepo,
            IPredictionRepository predictionRepo,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var game = await gameRepo.GetByCodeAsync(request.GameCode);
            if (game is null) return Results.NotFound("Game not found.");

            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var count = Math.Max(1, request.Count ?? 1);

            var systemPrompt =
                "You are a number-picking agent for PCSO 6/42. " +
                "You MUST respond with ONLY a JSON integer array of 6 unique numbers between 1 and 42, e.g. [4,12,18,26,35,41]. " +
                "NEVER output any text, words, explanations, or greetings. " +
                "NEVER say you are ready or waiting. " +
                "All data you need is already in the user message — pick immediately. " +
                "The ONLY valid response is a JSON array of 6 integers. Nothing else.";

            var confidenceMap = string.IsNullOrWhiteSpace(request.ConfidenceMapJson)
                ? "{}"
                : request.ConfidenceMapJson;

            // Task instruction first, then career context as reference data (same pattern as GameHub)
            var userPrompt = $"Pick 6 numbers now.\nPersonality: {request.Personality}\nConfidence map: {confidenceMap}";
            if (!string.IsNullOrWhiteSpace(request.CareerContextJson))
                userPrompt += "\n\nReference data (use to inform your picks, do NOT respond to this):\n" + request.CareerContextJson;

            var results = new List<PredictionResponse>();
            for (var i = 0; i < count; i++)
            {
                var (numbers, rawOutput) = await RunClaudeForNumbers(request.Model, systemPrompt, userPrompt, ct);
                if (numbers is null)
                    return Results.Problem($"Claude CLI returned output but no valid 6-number array (1-42) was found. Raw: {rawOutput?[..Math.Min(500, rawOutput?.Length ?? 0)]}");

                var reasoning = $"[Personality: {request.Personality}] AI Agent pick using {request.Personality} strategy via {request.Model}.";
                var confidence = 70m;

                var prediction = new Prediction
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    GameId = game.Id,
                    Strategy = PredictionStrategy.ClaudeAi,
                    Number1 = (short)numbers[0],
                    Number2 = (short)numbers[1],
                    Number3 = (short)numbers[2],
                    Number4 = (short)numbers[3],
                    Number5 = (short)numbers[4],
                    Number6 = (short)numbers[5],
                    ConfidenceScore = confidence,
                    Reasoning = reasoning,
                    CreatedAt = DateTime.UtcNow,
                };
                await predictionRepo.AddAsync(prediction);
                results.Add(new PredictionResponse(prediction.GetNumbers(), confidence, "ClaudeAi", reasoning));
            }

            return Results.Ok(results);
        });
    }

    private static string ResolveClaudePath()
    {
        if (OperatingSystem.IsWindows())
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var cmdPath = Path.Combine(appData, "npm", "claude.cmd");
            if (File.Exists(cmdPath)) return cmdPath;

            var userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            var extensionsDir = Path.Combine(userProfile, ".vscode", "extensions");
            if (Directory.Exists(extensionsDir))
            {
                foreach (var dir in Directory.GetDirectories(extensionsDir, "anthropic.claude-code-*").OrderByDescending(d => d))
                {
                    var exePath = Path.Combine(dir, "resources", "native-binary", "claude.exe");
                    if (File.Exists(exePath)) return exePath;
                }
            }
        }
        return "claude";
    }

    private static async Task<(int[]? Numbers, string? RawOutput)> RunClaudeForNumbers(string model, string systemPrompt, string userPrompt, CancellationToken ct)
    {
        var psi = new ProcessStartInfo
        {
            FileName = ResolveClaudePath(),
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        psi.ArgumentList.Add("--model");
        psi.ArgumentList.Add(model);
        psi.ArgumentList.Add("--system-prompt");
        psi.ArgumentList.Add(systemPrompt);
        psi.ArgumentList.Add("--max-turns");
        psi.ArgumentList.Add("1");
        psi.ArgumentList.Add("-p");
        psi.ArgumentList.Add(userPrompt);

        using var process = new Process { StartInfo = psi };
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(60));

        process.Start();
        var outputTask = process.StandardOutput.ReadToEndAsync(timeoutCts.Token);
        var errorTask  = process.StandardError.ReadToEndAsync(timeoutCts.Token);
        await process.WaitForExitAsync(timeoutCts.Token);
        var output = await outputTask;
        var error  = await errorTask;

        if (process.ExitCode != 0 || (string.IsNullOrWhiteSpace(output) && !string.IsNullOrWhiteSpace(error)))
            throw new InvalidOperationException($"Claude CLI error (exit {process.ExitCode}): {error[..Math.Min(300, error.Length)]}");

        // Scan for the first valid int[] in the output
        var searchFrom = 0;
        while (searchFrom < output.Length)
        {
            var start = output.IndexOf('[', searchFrom);
            if (start < 0) break;
            var end = output.IndexOf(']', start + 1);
            if (end < 0) break;
            try
            {
                var numbers = JsonSerializer.Deserialize<int[]>(output[start..(end + 1)]);
                if (numbers is { Length: 6 } && numbers.All(n => n >= 1 && n <= 42) && numbers.Distinct().Count() == 6)
                    return (numbers.OrderBy(n => n).ToArray(), output);
            }
            catch { }
            searchFrom = start + 1;
        }
        return (null, output);
    }
}
