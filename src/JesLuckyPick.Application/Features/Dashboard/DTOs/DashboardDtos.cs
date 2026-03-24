using JesLuckyPick.Application.Features.Draws.DTOs;

namespace JesLuckyPick.Application.Features.Dashboard.DTOs;

public record DashboardStatsDto(
    int TotalDraws,
    int MostFrequentNumber,
    int MostFrequentCount,
    decimal? LastJackpot,
    DateTime? LastDrawDate,
    int DaysSinceLastDraw);

public record DashboardDto(DashboardStatsDto Stats, List<DrawDto> RecentDraws);
