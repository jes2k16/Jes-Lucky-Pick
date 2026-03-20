using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace JesLuckyPick.Infrastructure.Persistence.Repositories;

public class LottoGameRepository(AppDbContext context) : ILottoGameRepository
{
    public async Task<LottoGame?> GetByCodeAsync(string code, CancellationToken ct = default)
        => await context.LottoGames.FirstOrDefaultAsync(g => g.Code == code, ct);

    public async Task<IReadOnlyList<LottoGame>> GetAllAsync(CancellationToken ct = default)
        => await context.LottoGames.OrderBy(g => g.Name).ToListAsync(ct);

    public async Task AddAsync(LottoGame game, CancellationToken ct = default)
    {
        await context.LottoGames.AddAsync(game, ct);
        await context.SaveChangesAsync(ct);
    }
}
