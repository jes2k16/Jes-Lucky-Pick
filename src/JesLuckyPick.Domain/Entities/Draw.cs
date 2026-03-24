namespace JesLuckyPick.Domain.Entities;

public class Draw
{
    public Guid Id { get; set; }
    public Guid GameId { get; set; }
    public DateTime DrawDate { get; set; }
    public short DayOfWeek { get; set; }
    public short Number1 { get; set; }
    public short Number2 { get; set; }
    public short Number3 { get; set; }
    public short Number4 { get; set; }
    public short Number5 { get; set; }
    public short Number6 { get; set; }
    public decimal? JackpotAmount { get; set; }
    public int? WinnersCount { get; set; }
    public DateTime CreatedAt { get; set; }

    public LottoGame Game { get; set; } = null!;

    public short[] GetNumbers() => [Number1, Number2, Number3, Number4, Number5, Number6];
}
