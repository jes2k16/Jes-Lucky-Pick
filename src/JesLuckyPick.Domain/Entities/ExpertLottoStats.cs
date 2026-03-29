namespace JesLuckyPick.Domain.Entities;

public class ExpertLottoStats
{
    public Guid Id { get; set; }
    public Guid ExpertCareerId { get; set; }
    public string LottoGameCode { get; set; } = string.Empty;
    public int GamesPlayed { get; set; }
    public int Wins { get; set; }
    public int Eliminations { get; set; }
    public string ConfidenceMapJson { get; set; } = "{}";
    public string GameMemoriesJson { get; set; } = "[]";
    public string? CareerSummaryJson { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ExpertCareer ExpertCareer { get; set; } = null!;
}
