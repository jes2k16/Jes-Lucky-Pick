using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace JesLuckyPick.Infrastructure.Persistence.Repositories;

public class ExpertCareerRepository(AppDbContext context) : IExpertCareerRepository
{
    public async Task<IReadOnlyList<ExpertCareer>> GetByUserAsync(
        Guid userId, CancellationToken ct = default)
        => await context.ExpertCareers
            .Include(c => c.LottoStats)
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.LastPlayedAt)
            .ToListAsync(ct);

    public async Task<ExpertCareer?> GetByUserNamePersonalityAsync(
        Guid userId, string name, string personality, CancellationToken ct = default)
        => await context.ExpertCareers
            .Include(c => c.LottoStats)
            .FirstOrDefaultAsync(c =>
                c.UserId == userId && c.Name == name && c.Personality == personality, ct);

    public async Task UpsertAsync(ExpertCareer career, CancellationToken ct = default)
    {
        var existing = await context.ExpertCareers
            .FirstOrDefaultAsync(c =>
                c.UserId == career.UserId &&
                c.Name == career.Name &&
                c.Personality == career.Personality, ct);

        if (existing is null)
        {
            await context.ExpertCareers.AddAsync(career, ct);
        }
        else
        {
            existing.GamesPlayed = career.GamesPlayed;
            existing.Wins = career.Wins;
            existing.Eliminations = career.Eliminations;
            existing.TotalRoundsPlayed = career.TotalRoundsPlayed;
            existing.BestEverScore = career.BestEverScore;
            existing.AvgRoundScore = career.AvgRoundScore;
            existing.LastPlayedAt = career.LastPlayedAt;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await context.SaveChangesAsync(ct);
    }

    public async Task UpsertStatsAsync(ExpertLottoStats stats, CancellationToken ct = default)
    {
        var existing = await context.ExpertLottoStats
            .FirstOrDefaultAsync(s =>
                s.ExpertCareerId == stats.ExpertCareerId &&
                s.LottoGameCode == stats.LottoGameCode, ct);

        if (existing is null)
        {
            await context.ExpertLottoStats.AddAsync(stats, ct);
        }
        else
        {
            existing.GamesPlayed = stats.GamesPlayed;
            existing.Wins = stats.Wins;
            existing.Eliminations = stats.Eliminations;
            existing.ConfidenceMapJson = stats.ConfidenceMapJson;
            existing.GameMemoriesJson = stats.GameMemoriesJson;
            existing.CareerSummaryJson = stats.CareerSummaryJson;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await context.SaveChangesAsync(ct);
    }

    public async Task BulkUpsertAsync(IEnumerable<ExpertCareer> careers, CancellationToken ct = default)
    {
        foreach (var career in careers)
        {
            var existing = await context.ExpertCareers
                .Include(c => c.LottoStats)
                .FirstOrDefaultAsync(c =>
                    c.UserId == career.UserId &&
                    c.Name == career.Name &&
                    c.Personality == career.Personality, ct);

            if (existing is null)
            {
                await context.ExpertCareers.AddAsync(career, ct);
            }
            else
            {
                if (career.GamesPlayed > existing.GamesPlayed)
                {
                    existing.GamesPlayed = career.GamesPlayed;
                    existing.Wins = career.Wins;
                    existing.Eliminations = career.Eliminations;
                    existing.TotalRoundsPlayed = career.TotalRoundsPlayed;
                    existing.BestEverScore = career.BestEverScore;
                    existing.AvgRoundScore = career.AvgRoundScore;
                    existing.LastPlayedAt = career.LastPlayedAt;
                    existing.UpdatedAt = DateTime.UtcNow;

                    foreach (var stat in career.LottoStats)
                    {
                        var existingStat = existing.LottoStats
                            .FirstOrDefault(s => s.LottoGameCode == stat.LottoGameCode);

                        if (existingStat is null)
                        {
                            stat.ExpertCareerId = existing.Id;
                            await context.ExpertLottoStats.AddAsync(stat, ct);
                        }
                        else
                        {
                            existingStat.GamesPlayed = stat.GamesPlayed;
                            existingStat.Wins = stat.Wins;
                            existingStat.Eliminations = stat.Eliminations;
                            existingStat.ConfidenceMapJson = stat.ConfidenceMapJson;
                            existingStat.GameMemoriesJson = stat.GameMemoriesJson;
                            existingStat.CareerSummaryJson = stat.CareerSummaryJson;
                            existingStat.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }
            }
        }

        await context.SaveChangesAsync(ct);
    }
}
