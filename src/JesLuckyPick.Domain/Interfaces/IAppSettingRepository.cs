using JesLuckyPick.Domain.Entities;

namespace JesLuckyPick.Domain.Interfaces;

public interface IAppSettingRepository
{
    Task<AppSetting?> GetByKeyAsync(string key, CancellationToken ct = default);
    Task<IReadOnlyList<AppSetting>> GetByPrefixAsync(string prefix, CancellationToken ct = default);
    Task UpsertAsync(AppSetting setting, CancellationToken ct = default);
}
