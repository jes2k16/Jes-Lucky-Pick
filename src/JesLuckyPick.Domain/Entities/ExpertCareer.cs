namespace JesLuckyPick.Domain.Entities;

public class ExpertCareer
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Personality { get; set; } = string.Empty;
    public int GamesPlayed { get; set; }
    public int Wins { get; set; }
    public int Eliminations { get; set; }
    public int TotalRoundsPlayed { get; set; }
    public int BestEverScore { get; set; }
    public decimal AvgRoundScore { get; set; }
    public DateTime? LastPlayedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<ExpertLottoStats> LottoStats { get; set; } = [];
}
