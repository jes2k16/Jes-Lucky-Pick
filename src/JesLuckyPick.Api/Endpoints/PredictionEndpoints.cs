using System.Security.Claims;
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
    }
}
