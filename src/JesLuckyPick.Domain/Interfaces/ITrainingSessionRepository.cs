using JesLuckyPick.Domain.Entities;

namespace JesLuckyPick.Domain.Interfaces;

public interface ITrainingSessionRepository
{
    Task<(IReadOnlyList<TrainingSession> Items, int TotalCount)> GetByUserPagedAsync(
        Guid userId, int page, int pageSize,
        string? gameMode = null,
        CancellationToken ct = default);

    /// <summary>
    /// Returns all training sessions across all users, optionally filtered by game mode.
    /// Intended for shared/global history views (e.g. Schedule History) where sessions
    /// may be created by multiple users — the Hangfire cron job runs as admin, while
    /// "Trigger Now" simulations run as the currently logged-in user.
    /// </summary>
    Task<(IReadOnlyList<TrainingSession> Items, int TotalCount)> GetAllPagedAsync(
        int page, int pageSize,
        string? gameMode = null,
        CancellationToken ct = default);

    Task AddAsync(TrainingSession session, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, Guid id, CancellationToken ct = default);
}
