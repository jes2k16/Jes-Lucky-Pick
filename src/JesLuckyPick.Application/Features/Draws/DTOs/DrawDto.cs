namespace JesLuckyPick.Application.Features.Draws.DTOs;

public record DrawDto(
    Guid Id,
    DateOnly DrawDate,
    string DayOfWeek,
    short[] Numbers,
    decimal? JackpotAmount,
    int? WinnersCount);
