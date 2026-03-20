using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace JesLuckyPick.Infrastructure.Persistence.Repositories;

public class DrawRepository(AppDbContext context) : IDrawRepository
{
    public async Task<Draw?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await context.Draws.Include(d => d.Game).FirstOrDefaultAsync(d => d.Id == id, ct);

    public async Task<(IReadOnlyList<Draw> Items, int TotalCount)> GetPagedAsync(
        Guid gameId, DateOnly? from, DateOnly? to,
        int page, int pageSize, CancellationToken ct = default)
    {
        var query = context.Draws.Where(d => d.GameId == gameId);

        if (from.HasValue)
            query = query.Where(d => d.DrawDate >= from.Value);
        if (to.HasValue)
            query = query.Where(d => d.DrawDate <= to.Value);

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(d => d.DrawDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<IReadOnlyList<Draw>> GetLatestAsync(Guid gameId, int count, CancellationToken ct = default)
        => await context.Draws
            .Where(d => d.GameId == gameId)
            .OrderByDescending(d => d.DrawDate)
            .Take(count)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Draw>> GetAllByGameAsync(Guid gameId, CancellationToken ct = default)
        => await context.Draws
            .Where(d => d.GameId == gameId)
            .OrderBy(d => d.DrawDate)
            .ToListAsync(ct);

    public async Task<int> GetCountAsync(Guid gameId, CancellationToken ct = default)
        => await context.Draws.CountAsync(d => d.GameId == gameId, ct);

    public async Task AddRangeAsync(IEnumerable<Draw> draws, CancellationToken ct = default)
    {
        await context.Draws.AddRangeAsync(draws, ct);
        await context.SaveChangesAsync(ct);
    }
}
