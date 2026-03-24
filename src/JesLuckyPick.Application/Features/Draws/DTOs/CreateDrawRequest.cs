namespace JesLuckyPick.Application.Features.Draws.DTOs;

public record CreateDrawRequest(
    string GameCode,
    DateTime DrawDate,
    short[] Numbers,
    decimal? JackpotAmount,
    int? WinnersCount);
