namespace JesLuckyPick.Application.Features.AgentPrompts.DTOs;

public record AgentPromptResponse(
    Guid Id,
    string Role,
    string? Personality,
    string SystemPrompt,
    string Model,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record UpdateAgentPromptRequest(
    string SystemPrompt,
    string Model,
    bool IsActive);

public record CreateAgentPromptRequest(
    string Role,
    string? Personality,
    string SystemPrompt,
    string Model);

public record TestAgentPromptRequest(
    string Prompt,
    string Model);

public record TestAgentPromptResponse(
    bool Success,
    string? Output,
    string? Error);
