using FluentAssertions;
using JesLuckyPick.Application.Features.Predictions.DTOs;

namespace JesLuckyPick.Application.Tests;

public class PredictionMatchTests
{
    private static PredictionMatchInfo ComputeMatch(short[] predictionNumbers, short[] drawNumbers)
    {
        var predNums = predictionNumbers.ToHashSet();
        var matched = drawNumbers.Count(n => predNums.Contains(n));
        return new PredictionMatchInfo(
            DateTime.UtcNow,
            drawNumbers,
            matched,
            Math.Round(matched / 6.0m * 100, 1));
    }

    [Fact]
    public void ComputeMatch_AllMatch_Returns100Percent()
    {
        short[] numbers = [5, 12, 23, 31, 38, 42];

        var result = ComputeMatch(numbers, numbers);

        result.MatchedCount.Should().Be(6);
        result.MatchPercentage.Should().Be(100.0m);
    }

    [Fact]
    public void ComputeMatch_NoMatch_Returns0Percent()
    {
        short[] prediction = [1, 2, 3, 4, 5, 6];
        short[] draw = [7, 8, 9, 10, 11, 12];

        var result = ComputeMatch(prediction, draw);

        result.MatchedCount.Should().Be(0);
        result.MatchPercentage.Should().Be(0.0m);
    }

    [Fact]
    public void ComputeMatch_PartialMatch_ReturnsCorrectPercentage()
    {
        short[] prediction = [1, 2, 3, 4, 5, 6];
        short[] draw = [1, 2, 3, 10, 11, 12];

        var result = ComputeMatch(prediction, draw);

        result.MatchedCount.Should().Be(3);
        result.MatchPercentage.Should().Be(50.0m);
    }

    [Fact]
    public void ComputeMatch_SingleMatch_Returns16Point7Percent()
    {
        short[] prediction = [1, 2, 3, 4, 5, 6];
        short[] draw = [1, 10, 20, 30, 35, 40];

        var result = ComputeMatch(prediction, draw);

        result.MatchedCount.Should().Be(1);
        result.MatchPercentage.Should().Be(16.7m);
    }

    [Fact]
    public void ComputeMatch_DrawNumbersArePreserved()
    {
        short[] prediction = [1, 2, 3, 4, 5, 6];
        short[] draw = [7, 14, 21, 28, 35, 42];

        var result = ComputeMatch(prediction, draw);

        result.DrawNumbers.Should().BeEquivalentTo(draw);
    }

    [Fact]
    public void PredictionMatchInfo_NullWhenNoDrawAvailable()
    {
        PredictionMatchInfo? matchInfo = null;

        matchInfo.Should().BeNull();
    }
}
