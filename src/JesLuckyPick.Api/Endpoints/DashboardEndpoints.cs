using JesLuckyPick.Application.Features.Dashboard.DTOs;
using JesLuckyPick.Application.Features.Draws.DTOs;
using JesLuckyPick.Domain.Interfaces;

namespace JesLuckyPick.Api.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/dashboard").RequireAuthorization();

        group.MapGet("/stats", async (
            IDrawRepository drawRepo,
            ILottoGameRepository gameRepo,
            string gameCode = "6_42") =>
        {
            var game = await gameRepo.GetByCodeAsync(gameCode);
            if (game is null) return Results.NotFound("Game not found.");

            var totalDraws = await drawRepo.GetCountAsync(game.Id);
            var allDraws = await drawRepo.GetAllByGameAsync(game.Id);

            // Most frequent number
            var frequency = new Dictionary<int, int>();
            for (var i = 1; i <= game.MaxNumber; i++) frequency[i] = 0;
            foreach (var draw in allDraws)
                foreach (var num in draw.GetNumbers())
                    frequency[num]++;

            var mostFrequent = frequency.MaxBy(kv => kv.Value);

            var latest = allDraws.LastOrDefault();
            var daysSinceLast = latest is not null
                ? (DateTime.UtcNow - latest.DrawDate).Days
                : 0;

            return Results.Ok(new DashboardStatsDto(
                totalDraws,
                mostFrequent.Key,
                mostFrequent.Value,
                latest?.JackpotAmount,
                latest?.DrawDate,
                daysSinceLast));
        });

        group.MapGet("/recent", async (
            IDrawRepository drawRepo,
            ILottoGameRepository gameRepo,
            string gameCode = "6_42",
            int count = 5) =>
        {
            var game = await gameRepo.GetByCodeAsync(gameCode);
            if (game is null) return Results.NotFound("Game not found.");

            var draws = await drawRepo.GetLatestAsync(game.Id, count);
            return Results.Ok(draws.Select(d => new DrawDto(
                d.Id, d.DrawDate, d.DrawDate.DayOfWeek.ToString(),
                d.GetNumbers(), d.JackpotAmount, d.WinnersCount)));
        });
    }
}
