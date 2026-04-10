using JesLuckyPick.Domain.Entities;

namespace JesLuckyPick.Domain.Interfaces;

public interface ITrainingScheduleRepository
{
    Task<TrainingSchedule?> GetAsync(CancellationToken ct = default);
    Task<TrainingSchedule> UpsertAsync(TrainingSchedule schedule, CancellationToken ct = default);
}
