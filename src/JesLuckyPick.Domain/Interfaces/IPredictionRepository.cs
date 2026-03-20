using JesLuckyPick.Domain.Entities;

namespace JesLuckyPick.Domain.Interfaces;

public interface IPredictionRepository
{
    Task<Prediction?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<(IReadOnlyList<Prediction> Items, int TotalCount)> GetByUserPagedAsync(
        Guid userId, int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(Prediction prediction, CancellationToken ct = default);
}
