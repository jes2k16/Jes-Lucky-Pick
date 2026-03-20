namespace JesLuckyPick.Application.Features.Analysis.DTOs;

public record FrequencyDto(int Number, int Count, double Percentage);

public record HotColdDto(
    List<NumberScore> HotNumbers,
    List<NumberScore> ColdNumbers,
    int Period);

public record NumberScore(int Number, int Count, double ZScore);

public record GapDto(int Number, int CurrentGap, double AverageGap);

public record PatternDto(
    List<OddEvenDistribution> OddEvenDistributions,
    List<SumRangeDistribution> SumRangeDistributions,
    List<DecadeDistribution> DecadeDistributions);

public record OddEvenDistribution(string Pattern, int Count, double Percentage);
public record SumRangeDistribution(string Range, int Count, double Percentage);
public record DecadeDistribution(string Decade, double AverageCount);
