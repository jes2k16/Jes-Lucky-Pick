using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace JesLuckyPick.Infrastructure.Persistence.Repositories;

public class AppSettingRepository(AppDbContext context) : IAppSettingRepository
{
    public async Task<AppSetting?> GetByKeyAsync(string key, CancellationToken ct = default)
        => await context.AppSettings.FindAsync([key], ct);

    public async Task<IReadOnlyList<AppSetting>> GetByPrefixAsync(string prefix, CancellationToken ct = default)
        => await context.AppSettings
            .Where(s => s.Key.StartsWith(prefix))
            .ToListAsync(ct);

    public async Task UpsertAsync(AppSetting setting, CancellationToken ct = default)
    {
        var existing = await context.AppSettings.FindAsync([setting.Key], ct);
        if (existing is null)
        {
            context.AppSettings.Add(setting);
        }
        else
        {
            existing.Value = setting.Value;
            existing.UpdatedAt = setting.UpdatedAt;
            existing.UpdatedByUserId = setting.UpdatedByUserId;
        }
        await context.SaveChangesAsync(ct);
    }
}
