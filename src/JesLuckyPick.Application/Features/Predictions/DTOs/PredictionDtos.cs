namespace JesLuckyPick.Application.Features.Predictions.DTOs;

public record PredictionRequest(string GameCode, string Strategy, int Count = 1);

public record PredictionResponse(
    short[] Numbers,
    decimal ConfidenceScore,
    string Strategy,
    string Reasoning);
