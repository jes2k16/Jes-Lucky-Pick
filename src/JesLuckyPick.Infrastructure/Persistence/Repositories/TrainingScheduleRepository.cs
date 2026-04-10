using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace JesLuckyPick.Infrastructure.Persistence.Repositories;

public class TrainingScheduleRepository(AppDbContext context) : ITrainingScheduleRepository
{
    public async Task<TrainingSchedule?> GetAsync(CancellationToken ct = default) =>
        await context.TrainingSchedules.FirstOrDefaultAsync(ct);

    public async Task<TrainingSchedule> UpsertAsync(TrainingSchedule schedule, CancellationToken ct = default)
    {
        var existing = await context.TrainingSchedules.FirstOrDefaultAsync(ct);
        if (existing is null)
        {
            schedule.Id = Guid.NewGuid();
            schedule.CreatedAtUtc = DateTime.UtcNow;
            schedule.UpdatedAtUtc = DateTime.UtcNow;
            await context.TrainingSchedules.AddAsync(schedule, ct);
        }
        else
        {
            existing.IsEnabled = schedule.IsEnabled;
            existing.FrequencyType = schedule.FrequencyType;
            existing.DaysOfWeekMask = schedule.DaysOfWeekMask;
            existing.TimeSlotsJson = schedule.TimeSlotsJson;
            existing.GameSettingsJson = schedule.GameSettingsJson;
            existing.UpdatedAtUtc = DateTime.UtcNow;
            schedule = existing;
        }

        await context.SaveChangesAsync(ct);
        return schedule;
    }
}
