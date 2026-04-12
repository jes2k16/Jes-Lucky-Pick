using System.Text.Json;
using Hangfire;
using Hangfire.Storage;
using JesLuckyPick.Domain.Entities;

namespace JesLuckyPick.Infrastructure.Training;

public class TrainingSchedulerService(IRecurringJobManager jobManager)
{
    private const string JobPrefix = "training-schedule";

    // DaysOfWeekMask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
    // NCrontab day:   Mon=1, Tue=2, Wed=3, Thu=4, Fri=5,  Sat=6,  Sun=0
    private static readonly (int Bit, int CronDay)[] DayMappings =
    [
        (1,  1),  // Mon
        (2,  2),  // Tue
        (4,  3),  // Wed
        (8,  4),  // Thu
        (16, 5),  // Fri
        (32, 6),  // Sat
        (64, 0),  // Sun
    ];

    public void Apply(TrainingSchedule schedule)
    {
        RemoveAllJobs(schedule.Id);

        if (!schedule.IsEnabled) return;

        if (schedule.FrequencyType == "interval")
        {
            ApplyInterval(schedule);
            return;
        }

        string[] slots;
        try
        {
            slots = JsonSerializer.Deserialize<string[]>(schedule.TimeSlotsJson) ?? [];
        }
        catch
        {
            return;
        }

        if (slots.Length == 0) return;

        var cronDays = BuildCronDaysList(schedule.FrequencyType, schedule.DaysOfWeekMask);

        foreach (var slot in slots)
        {
            var cron = BuildCron(slot, schedule.FrequencyType, cronDays);
            if (cron is null) continue;

            var jobId = $"{JobPrefix}-{schedule.Id}-{slot.Replace(":", "")}";
            jobManager.AddOrUpdate<ScheduledTrainingJob>(jobId, j => j.RunAsync(), cron);
        }
    }

    private void ApplyInterval(TrainingSchedule schedule)
    {
        var minutes = schedule.IntervalMinutes;
        if (minutes <= 0) return;

        string cron;
        if (minutes < 60)
        {
            cron = $"*/{minutes} * * * *";
        }
        else
        {
            var hours = minutes / 60;
            cron = $"0 */{hours} * * *";
        }

        var jobId = $"{JobPrefix}-{schedule.Id}-interval";
        jobManager.AddOrUpdate<ScheduledTrainingJob>(jobId, j => j.RunAsync(), cron);
    }

    public void RemoveAll(Guid scheduleId) => RemoveAllJobs(scheduleId);

    private void RemoveAllJobs(Guid scheduleId)
    {
        // GetRecurringJobs() is a StorageExtensions method on IStorageConnection.
        var prefix = $"{JobPrefix}-{scheduleId}-";
        using var connection = JobStorage.Current.GetConnection();
        var recurringJobs = connection.GetRecurringJobs();
        foreach (var job in recurringJobs.Where(j => j.Id.StartsWith(prefix)))
            jobManager.RemoveIfExists(job.Id);
    }

    private static string? BuildCron(string timeSlot, string frequencyType, int[] cronDays)
    {
        var parts = timeSlot.Split(':');
        if (parts.Length != 2 ||
            !int.TryParse(parts[0], out var hour) ||
            !int.TryParse(parts[1], out var minute))
            return null;

        var dayExpr = frequencyType == "weekly" && cronDays.Length > 0
            ? string.Join(",", cronDays)
            : "*";

        return $"{minute} {hour} * * {dayExpr}";
    }

    private static int[] BuildCronDaysList(string frequencyType, int daysOfWeekMask)
    {
        if (frequencyType != "weekly") return [];

        return DayMappings
            .Where(m => (daysOfWeekMask & m.Bit) != 0)
            .Select(m => m.CronDay)
            .ToArray();
    }
}
