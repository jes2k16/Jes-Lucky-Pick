namespace JesLuckyPick.Domain.Entities;

public class AgentPrompt
{
    public Guid Id { get; set; }
    public string Role { get; set; } = string.Empty;           // "Expert" or "Manager"
    public string? Personality { get; set; }                    // "Scanner","Sticky","Gambler","Analyst" (null for Manager)
    public string SystemPrompt { get; set; } = string.Empty;   // Prompt template with {placeholders}
    public string Model { get; set; } = string.Empty;          // e.g. "claude-haiku-4-5-20251001"
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
