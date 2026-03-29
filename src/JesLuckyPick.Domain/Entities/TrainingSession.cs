namespace JesLuckyPick.Domain.Entities;

public class TrainingSession
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string GameMode { get; set; } = string.Empty;
    public string LottoGameCode { get; set; } = string.Empty;
    public string Result { get; set; } = string.Empty;
    public int DurationSeconds { get; set; }
    public int TotalRounds { get; set; }
    public int TotalExperts { get; set; }
    public int SurvivingExperts { get; set; }
    public string SettingsJson { get; set; } = string.Empty;
    public string? WinnerJson { get; set; }
    public string? WinnerProfileJson { get; set; }
    public string? LeaderboardJson { get; set; }
    public DateTime PlayedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
}
