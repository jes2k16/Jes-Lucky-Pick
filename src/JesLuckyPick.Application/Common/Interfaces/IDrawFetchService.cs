using JesLuckyPick.Domain.Entities;

namespace JesLuckyPick.Application.Common.Interfaces;

public interface IDrawFetchService
{
    Task<IReadOnlyList<Draw>> FetchLatestDrawsAsync(string gameCode, CancellationToken ct = default);
}
