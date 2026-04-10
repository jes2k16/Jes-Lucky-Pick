using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace JesLuckyPick.Infrastructure.Persistence.Repositories;

public class TrainingSessionRepository(AppDbContext context) : ITrainingSessionRepository
{
    public async Task<(IReadOnlyList<TrainingSession> Items, int TotalCount)> GetByUserPagedAsync(
        Guid userId, int page, int pageSize,
        string? gameMode = null,
        CancellationToken ct = default)
    {
        var query = context.TrainingSessions.Where(s => s.UserId == userId);
        if (gameMode is not null)
            query = query.Where(s => s.GameMode == gameMode);
        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(s => s.PlayedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<(IReadOnlyList<TrainingSession> Items, int TotalCount)> GetAllPagedAsync(
        int page, int pageSize,
        string? gameMode = null,
        CancellationToken ct = default)
    {
        var query = context.TrainingSessions.AsQueryable();
        if (gameMode is not null)
            query = query.Where(s => s.GameMode == gameMode);
        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(s => s.PlayedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task AddAsync(TrainingSession session, CancellationToken ct = default)
    {
        await context.TrainingSessions.AddAsync(session, ct);
        await context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var session = await context.TrainingSessions
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);
        if (session is null) return;
        context.TrainingSessions.Remove(session);
        await context.SaveChangesAsync(ct);
    }
}
