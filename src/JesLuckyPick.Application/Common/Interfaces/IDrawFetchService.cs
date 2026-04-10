using JesLuckyPick.Domain.Entities;

namespace JesLuckyPick.Application.Common.Interfaces;

public record DrawSyncResult(
    IReadOnlyList<Draw> Added,
    IReadOnlyList<Draw> Updated);

public interface IDrawFetchService
{
    Task<DrawSyncResult> FetchLatestDrawsAsync(string gameCode, CancellationToken ct = default);
}
