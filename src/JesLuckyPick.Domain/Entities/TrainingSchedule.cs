namespace JesLuckyPick.Domain.Entities;

public class TrainingSchedule
{
    public Guid Id { get; set; }
    public bool IsEnabled { get; set; }

    /// <summary>"daily", "weekly", or "interval"</summary>
    public string FrequencyType { get; set; } = "daily";

    /// <summary>
    /// Bitmask of selected days (weekly mode only).
    /// Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
    /// </summary>
    public int DaysOfWeekMask { get; set; }

    /// <summary>Interval in minutes (interval mode only). E.g. 15 = every 15 minutes, 60 = every hour.</summary>
    public int IntervalMinutes { get; set; }

    /// <summary>JSON array of UTC time strings, e.g. ["00:00","12:00"]</summary>
    public string TimeSlotsJson { get; set; } = "[]";

    /// <summary>Serialized ScheduledGameSettings — historicalDraws fetched at runtime</summary>
    public string GameSettingsJson { get; set; } = "{}";

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
