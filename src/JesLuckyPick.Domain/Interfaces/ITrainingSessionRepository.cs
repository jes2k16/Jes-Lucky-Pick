using JesLuckyPick.Domain.Entities;

namespace JesLuckyPick.Domain.Interfaces;

public interface ITrainingSessionRepository
{
    Task<(IReadOnlyList<TrainingSession> Items, int TotalCount)> GetByUserPagedAsync(
        Guid userId, int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(TrainingSession session, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, Guid id, CancellationToken ct = default);
}
