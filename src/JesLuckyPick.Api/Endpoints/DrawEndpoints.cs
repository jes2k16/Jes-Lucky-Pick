using JesLuckyPick.Application.Features.Draws.DTOs;
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

            DateOnly? fromDate = from is not null ? DateOnly.Parse(from) : null;
            DateOnly? toDate = to is not null ? DateOnly.Parse(to) : null;

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
    }
}
