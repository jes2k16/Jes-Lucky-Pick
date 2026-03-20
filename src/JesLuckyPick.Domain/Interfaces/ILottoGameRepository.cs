using JesLuckyPick.Domain.Entities;

namespace JesLuckyPick.Domain.Interfaces;

public interface ILottoGameRepository
{
    Task<LottoGame?> GetByCodeAsync(string code, CancellationToken ct = default);
    Task<IReadOnlyList<LottoGame>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(LottoGame game, CancellationToken ct = default);
}
