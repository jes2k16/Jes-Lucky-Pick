namespace JesLuckyPick.Domain.Entities;

public class LottoGame
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int MaxNumber { get; set; }
    public int PickCount { get; set; }
    public int DrawsPerWeek { get; set; }
    public string DrawDays { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<Draw> Draws { get; set; } = [];
    public ICollection<Prediction> Predictions { get; set; } = [];
}
