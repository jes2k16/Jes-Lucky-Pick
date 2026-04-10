namespace JesLuckyPick.Domain.Entities;

public class TrainingSchedule
{
    public Guid Id { get; set; }
    public bool IsEnabled { get; set; }

    /// <summary>"daily" or "weekly"</summary>
    public string FrequencyType { get; set; } = "daily";

    /// <summary>
    /// Bitmask of selected days (weekly mode only).
    /// Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
    /// </summary>
    public int DaysOfWeekMask { get; set; }

    /// <summary>JSON array of UTC time strings, e.g. ["00:00","12:00"]</summary>
    public string TimeSlotsJson { get; set; } = "[]";

    /// <summary>Serialized ScheduledGameSettings — historicalDraws fetched at runtime</summary>
    public string GameSettingsJson { get; set; } = "{}";

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
