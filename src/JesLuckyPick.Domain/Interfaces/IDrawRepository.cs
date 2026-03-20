using JesLuckyPick.Domain.Entities;

namespace JesLuckyPick.Domain.Interfaces;

public interface IDrawRepository
{
    Task<Draw?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<(IReadOnlyList<Draw> Items, int TotalCount)> GetPagedAsync(
        Guid gameId, DateOnly? from, DateOnly? to,
        int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<Draw>> GetLatestAsync(Guid gameId, int count, CancellationToken ct = default);
    Task<IReadOnlyList<Draw>> GetAllByGameAsync(Guid gameId, CancellationToken ct = default);
    Task<int> GetCountAsync(Guid gameId, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<Draw> draws, CancellationToken ct = default);
}
