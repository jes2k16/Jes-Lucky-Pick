namespace JesLuckyPick.Application.Features.Predictions.DTOs;

public record PredictionRequest(string GameCode, string Strategy, int Count = 1);

public record SavePredictionRequest(
    string GameCode,
    int[] Numbers,
    string Strategy,
    decimal ConfidenceScore,
    string Reasoning);

public record AgentPredictionRequest(
    string GameCode,
    string Personality,
    string Model,
    int? Count,
    string? ConfidenceMapJson,
    string? CareerContextJson);

public record PredictionResponse(
    short[] Numbers,
    decimal ConfidenceScore,
    string Strategy,
    string Reasoning);

public record PredictionHistoryItem(
    Guid Id,
    short[] Numbers,
    decimal ConfidenceScore,
    string Strategy,
    string Reasoning,
    DateTime CreatedAt,
    PredictionMatchInfo? MatchInfo);

public record PredictionMatchInfo(
    DateTime DrawDate,
    short[] DrawNumbers,
    int MatchedCount,
    decimal MatchPercentage);
