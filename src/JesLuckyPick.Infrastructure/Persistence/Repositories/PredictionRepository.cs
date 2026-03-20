using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace JesLuckyPick.Infrastructure.Persistence.Repositories;

public class PredictionRepository(AppDbContext context) : IPredictionRepository
{
    public async Task<Prediction?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await context.Predictions
            .Include(p => p.Game)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<(IReadOnlyList<Prediction> Items, int TotalCount)> GetByUserPagedAsync(
        Guid userId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = context.Predictions.Where(p => p.UserId == userId);
        var totalCount = await query.CountAsync(ct);
        var items = await query
            .Include(p => p.Game)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task AddAsync(Prediction prediction, CancellationToken ct = default)
    {
        await context.Predictions.AddAsync(prediction, ct);
        await context.SaveChangesAsync(ct);
    }
}
