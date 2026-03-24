using JesLuckyPick.Application.Common.Interfaces;
using JesLuckyPick.Application.Features.Draws.DTOs;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;

namespace JesLuckyPick.Api.Endpoints;

public static class DrawEndpoints
{
    public static void MapDrawEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/draws").RequireAuthorization();

        group.MapGet("/", async (
            IDrawRepository drawRepo,
            ILottoGameRepository gameRepo,
            string gameCode = "6_42",
            string? from = null,
            string? to = null,
            int page = 1,
            int pageSize = 20) =>
        {
            var game = await gameRepo.GetByCodeAsync(gameCode);
            if (game is null) return Results.NotFound("Game not found.");

            DateTime? fromDate = from is not null ? DateTime.Parse(from).ToUniversalTime() : null;
            DateTime? toDate = to is not null ? DateTime.Parse(to).ToUniversalTime() : null;

            var (items, totalCount) = await drawRepo.GetPagedAsync(
                game.Id, fromDate, toDate, page, pageSize);

            var draws = items.Select(d => new DrawDto(
                d.Id, d.DrawDate, d.DrawDate.DayOfWeek.ToString(),
                d.GetNumbers(), d.JackpotAmount, d.WinnersCount)).ToList();

            return Results.Ok(new { items = draws, totalCount, page, pageSize });
        });

        group.MapGet("/{id:guid}", async (Guid id, IDrawRepository drawRepo) =>
        {
            var draw = await drawRepo.GetByIdAsync(id);
            if (draw is null) return Results.NotFound();

            return Results.Ok(new DrawDto(
                draw.Id, draw.DrawDate, draw.DrawDate.DayOfWeek.ToString(),
                draw.GetNumbers(), draw.JackpotAmount, draw.WinnersCount));
        });

        group.MapGet("/latest", async (
            IDrawRepository drawRepo,
            ILottoGameRepository gameRepo,
            string gameCode = "6_42",
            int count = 10) =>
        {
            var game = await gameRepo.GetByCodeAsync(gameCode);
            if (game is null) return Results.NotFound("Game not found.");

            var draws = await drawRepo.GetLatestAsync(game.Id, count);
            return Results.Ok(draws.Select(d => new DrawDto(
                d.Id, d.DrawDate, d.DrawDate.DayOfWeek.ToString(),
                d.GetNumbers(), d.JackpotAmount, d.WinnersCount)));
        });

        group.MapGet("/context", async (
            IDrawRepository drawRepo4,
            ILottoGameRepository gameRepo3,
            string gameCode = "6_42") =>
        {
            var game = await gameRepo3.GetByCodeAsync(gameCode);
            if (game is null) return Results.NotFound("Game not found.");

            var latest = await drawRepo4.GetLatestAsync(game.Id, 1);
            var lastDraw = latest.Count > 0
                ? new LastDrawInfoDto(
                    latest[0].DrawDate,
                    latest[0].GetNumbers(),
                    latest[0].JackpotAmount,
                    latest[0].WinnersCount)
                : null;

            return Results.Ok(new DrawContextDto(lastDraw, new GameScheduleDto(game.DrawDays)));
        });

        group.MapPost("/fetch-latest", async (
            IDrawFetchService drawFetchService,
            IDrawRepository drawRepo2,
            string gameCode = "6_42") =>
        {
            try
            {
                var newDraws = await drawFetchService.FetchLatestDrawsAsync(gameCode);
                if (newDraws.Count == 0)
                    return Results.Ok(new { added = 0, message = "No new draws found." });

                await drawRepo2.AddRangeAsync(newDraws);
                return Results.Ok(new { added = newDraws.Count, message = $"{newDraws.Count} new draw(s) added." });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        }).RequireAuthorization();

        group.MapPost("/", async (
            CreateDrawRequest request,
            IDrawRepository drawRepo3,
            ILottoGameRepository gameRepo2) =>
        {
            var game = await gameRepo2.GetByCodeAsync(request.GameCode);
            if (game is null) return Results.NotFound("Game not found.");

            if (request.Numbers.Length != game.PickCount)
                return Results.BadRequest($"Exactly {game.PickCount} numbers required.");

            if (request.Numbers.Any(n => n < 1 || n > game.MaxNumber))
                return Results.BadRequest($"Numbers must be between 1 and {game.MaxNumber}.");

            if (request.Numbers.Distinct().Count() != request.Numbers.Length)
                return Results.BadRequest("Numbers must be unique.");

            var sorted = request.Numbers.Order().ToArray();

            var draw = new Draw
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                DrawDate = request.DrawDate,
                DayOfWeek = (short)request.DrawDate.DayOfWeek,
                Number1 = sorted[0],
                Number2 = sorted[1],
                Number3 = sorted[2],
                Number4 = sorted[3],
                Number5 = sorted[4],
                Number6 = sorted[5],
                JackpotAmount = request.JackpotAmount,
                WinnersCount = request.WinnersCount,
                CreatedAt = DateTime.UtcNow
            };

            await drawRepo3.AddRangeAsync([draw]);
            return Results.Created($"/api/draws/{draw.Id}", new DrawDto(
                draw.Id, draw.DrawDate, draw.DrawDate.DayOfWeek.ToString(),
                draw.GetNumbers(), draw.JackpotAmount, draw.WinnersCount));
        }).RequireAuthorization();
    }
}
