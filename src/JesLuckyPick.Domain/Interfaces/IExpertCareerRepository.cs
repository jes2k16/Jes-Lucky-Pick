using JesLuckyPick.Domain.Entities;

namespace JesLuckyPick.Domain.Interfaces;

public interface IExpertCareerRepository
{
    Task<IReadOnlyList<ExpertCareer>> GetByUserAsync(Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<ExpertCareer>> GetAllAsync(CancellationToken ct = default);
    Task<ExpertCareer?> GetByUserNamePersonalityAsync(
        Guid userId, string name, string personality, CancellationToken ct = default);
    Task UpsertAsync(ExpertCareer career, CancellationToken ct = default);
    Task UpsertStatsAsync(ExpertLottoStats stats, CancellationToken ct = default);
    Task BulkUpsertAsync(IEnumerable<ExpertCareer> careers, CancellationToken ct = default);
    Task PatchAsync(Guid userId, Guid id, string? name, bool? isFavorite, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, Guid id, CancellationToken ct = default);
}
