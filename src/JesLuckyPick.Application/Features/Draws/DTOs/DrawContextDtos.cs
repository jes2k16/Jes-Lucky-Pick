namespace JesLuckyPick.Application.Features.Draws.DTOs;

public record LastDrawInfoDto(
    DateTime DrawDate,
    short[] Numbers,
    decimal? JackpotAmount,
    int? WinnersCount);

public record GameScheduleDto(string DrawDays);

public record DrawContextDto(
    LastDrawInfoDto? LastDraw,
    GameScheduleDto Schedule);
