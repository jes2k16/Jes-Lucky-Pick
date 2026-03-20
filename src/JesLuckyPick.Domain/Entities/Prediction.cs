using JesLuckyPick.Domain.Enums;

namespace JesLuckyPick.Domain.Entities;

public class Prediction
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid GameId { get; set; }
    public PredictionStrategy Strategy { get; set; }
    public short Number1 { get; set; }
    public short Number2 { get; set; }
    public short Number3 { get; set; }
    public short Number4 { get; set; }
    public short Number5 { get; set; }
    public short Number6 { get; set; }
    public decimal ConfidenceScore { get; set; }
    public string Reasoning { get; set; } = string.Empty;
    public DateOnly? TargetDrawDate { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public LottoGame Game { get; set; } = null!;

    public short[] GetNumbers() => [Number1, Number2, Number3, Number4, Number5, Number6];
}
