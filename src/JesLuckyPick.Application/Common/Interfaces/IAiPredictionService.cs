using JesLuckyPick.Application.Features.Predictions.DTOs;
using JesLuckyPick.Domain.Entities;

namespace JesLuckyPick.Application.Common.Interfaces;

public interface IAiPredictionService
{
    Task<bool> IsConfiguredAsync(CancellationToken ct = default);
    Task<PredictionResponse> GeneratePredictionAsync(
        IReadOnlyList<Draw> historicalDraws, CancellationToken ct = default);
}
