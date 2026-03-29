using System.Security.Claims;
using System.Text.Json;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;

namespace JesLuckyPick.Api.Endpoints;

public static class TrainingEndpoints
{
    public static void MapTrainingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/training").RequireAuthorization();

        group.MapPost("/sessions", async (
            TrainingSessionRequest request,
            ITrainingSessionRepository sessionRepo,
            ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var session = new TrainingSession
            {
                Id = request.Id ?? Guid.NewGuid(),
                UserId = userId,
                GameMode = request.GameMode,
                LottoGameCode = request.LottoGameCode,
                Result = request.Result,
                DurationSeconds = request.DurationSeconds,
                TotalRounds = request.TotalRounds,
                TotalExperts = request.TotalExperts,
                SurvivingExperts = request.SurvivingExperts,
                SettingsJson = request.SettingsJson,
                WinnerJson = request.WinnerJson,
                LeaderboardJson = request.LeaderboardJson,
                PlayedAt = request.PlayedAt,
                CreatedAt = DateTime.UtcNow
            };

            await sessionRepo.AddAsync(session);
            return Results.Created($"/api/training/sessions/{session.Id}", new { session.Id });
        });

        group.MapGet("/sessions", async (
            ITrainingSessionRepository sessionRepo,
            ClaimsPrincipal user,
            int page = 1,
            int pageSize = 20) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var (items, totalCount) = await sessionRepo.GetByUserPagedAsync(userId, page, pageSize);

            return Results.Ok(new
            {
                items = items.Select(s => new
                {
                    s.Id, s.GameMode, s.LottoGameCode, s.Result,
                    s.DurationSeconds, s.TotalRounds, s.TotalExperts,
                    s.SurvivingExperts, s.SettingsJson, s.WinnerJson,
                    s.LeaderboardJson, s.PlayedAt
                }),
                totalCount, page, pageSize
            });
        });

        group.MapGet("/careers", async (
            IExpertCareerRepository careerRepo,
            ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var careers = await careerRepo.GetByUserAsync(userId);

            return Results.Ok(careers.Select(c => new ExpertCareerDto
            {
                Id = c.Id,
                Name = c.Name,
                Personality = c.Personality,
                GamesPlayed = c.GamesPlayed,
                Wins = c.Wins,
                Eliminations = c.Eliminations,
                TotalRoundsPlayed = c.TotalRoundsPlayed,
                BestEverScore = c.BestEverScore,
                AvgRoundScore = c.AvgRoundScore,
                LastPlayedAt = c.LastPlayedAt,
                LottoStats = c.LottoStats.Select(s => new ExpertLottoStatsDto
                {
                    LottoGameCode = s.LottoGameCode,
                    GamesPlayed = s.GamesPlayed,
                    Wins = s.Wins,
                    Eliminations = s.Eliminations,
                    ConfidenceMapJson = s.ConfidenceMapJson,
                    GameMemoriesJson = s.GameMemoriesJson,
                    CareerSummaryJson = s.CareerSummaryJson
                }).ToList()
            }));
        });

        group.MapPost("/careers/sync", async (
            List<ExpertCareerSyncRequest> request,
            IExpertCareerRepository careerRepo,
            ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var careers = request.Select(r =>
            {
                var career = new ExpertCareer
                {
                    Id = r.Id ?? Guid.NewGuid(),
                    UserId = userId,
                    Name = r.Name,
                    Personality = r.Personality,
                    GamesPlayed = r.GamesPlayed,
                    Wins = r.Wins,
                    Eliminations = r.Eliminations,
                    TotalRoundsPlayed = r.TotalRoundsPlayed,
                    BestEverScore = r.BestEverScore,
                    AvgRoundScore = r.AvgRoundScore,
                    LastPlayedAt = r.LastPlayedAt,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                career.LottoStats = r.LottoStats.Select(s => new ExpertLottoStats
                {
                    Id = Guid.NewGuid(),
                    ExpertCareerId = career.Id,
                    LottoGameCode = s.LottoGameCode,
                    GamesPlayed = s.GamesPlayed,
                    Wins = s.Wins,
                    Eliminations = s.Eliminations,
                    ConfidenceMapJson = s.ConfidenceMapJson,
                    GameMemoriesJson = s.GameMemoriesJson,
                    CareerSummaryJson = s.CareerSummaryJson,
                    UpdatedAt = DateTime.UtcNow
                }).ToList();

                return career;
            }).ToList();

            await careerRepo.BulkUpsertAsync(careers);
            return Results.Ok(new { synced = careers.Count });
        });

        group.MapGet("/careers/{name}/{personality}/stats", async (
            string name,
            string personality,
            IExpertCareerRepository careerRepo,
            ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var career = await careerRepo.GetByUserNamePersonalityAsync(userId, name, personality);

            if (career is null) return Results.NotFound();

            return Results.Ok(new ExpertCareerDto
            {
                Id = career.Id,
                Name = career.Name,
                Personality = career.Personality,
                GamesPlayed = career.GamesPlayed,
                Wins = career.Wins,
                Eliminations = career.Eliminations,
                TotalRoundsPlayed = career.TotalRoundsPlayed,
                BestEverScore = career.BestEverScore,
                AvgRoundScore = career.AvgRoundScore,
                LastPlayedAt = career.LastPlayedAt,
                LottoStats = career.LottoStats.Select(s => new ExpertLottoStatsDto
                {
                    LottoGameCode = s.LottoGameCode,
                    GamesPlayed = s.GamesPlayed,
                    Wins = s.Wins,
                    Eliminations = s.Eliminations,
                    ConfidenceMapJson = s.ConfidenceMapJson,
                    GameMemoriesJson = s.GameMemoriesJson,
                    CareerSummaryJson = s.CareerSummaryJson
                }).ToList()
            });
        });
    }
}

// Request/Response DTOs
public record TrainingSessionRequest(
    Guid? Id,
    string GameMode,
    string LottoGameCode,
    string Result,
    int DurationSeconds,
    int TotalRounds,
    int TotalExperts,
    int SurvivingExperts,
    string SettingsJson,
    string? WinnerJson,
    string? LeaderboardJson,
    DateTime PlayedAt);

public class ExpertCareerDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Personality { get; set; } = string.Empty;
    public int GamesPlayed { get; set; }
    public int Wins { get; set; }
    public int Eliminations { get; set; }
    public int TotalRoundsPlayed { get; set; }
    public int BestEverScore { get; set; }
    public decimal AvgRoundScore { get; set; }
    public DateTime? LastPlayedAt { get; set; }
    public List<ExpertLottoStatsDto> LottoStats { get; set; } = [];
}

public class ExpertLottoStatsDto
{
    public string LottoGameCode { get; set; } = string.Empty;
    public int GamesPlayed { get; set; }
    public int Wins { get; set; }
    public int Eliminations { get; set; }
    public string ConfidenceMapJson { get; set; } = "{}";
    public string GameMemoriesJson { get; set; } = "[]";
    public string? CareerSummaryJson { get; set; }
}

public class ExpertCareerSyncRequest
{
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Personality { get; set; } = string.Empty;
    public int GamesPlayed { get; set; }
    public int Wins { get; set; }
    public int Eliminations { get; set; }
    public int TotalRoundsPlayed { get; set; }
    public int BestEverScore { get; set; }
    public decimal AvgRoundScore { get; set; }
    public DateTime? LastPlayedAt { get; set; }
    public List<ExpertLottoStatsDto> LottoStats { get; set; } = [];
}
