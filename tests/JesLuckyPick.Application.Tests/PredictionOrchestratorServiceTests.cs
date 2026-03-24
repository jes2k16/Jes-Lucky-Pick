using FluentAssertions;
using JesLuckyPick.Application.Common.Interfaces;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;
using JesLuckyPick.Infrastructure.AI.Services;
using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace JesLuckyPick.Application.Tests;

public class PredictionOrchestratorServiceTests
{
    private readonly IDrawRepository _drawRepository = Substitute.For<IDrawRepository>();
    private readonly IAiPredictionService _aiPredictionService = Substitute.For<IAiPredictionService>();
    private readonly PredictionOrchestratorService _sut;
    private readonly Guid _gameId = Guid.NewGuid();

    public PredictionOrchestratorServiceTests()
    {
        _sut = new PredictionOrchestratorService(_drawRepository, _aiPredictionService);
    }

    private static List<Draw> CreateDraws(int count)
    {
        var draws = new List<Draw>();
        var rng = new Random(42); // deterministic seed
        for (var i = 0; i < count; i++)
        {
            var nums = Enumerable.Range(1, 42)
                .OrderBy(_ => rng.Next())
                .Take(6)
                .Order()
                .Select(n => (short)n)
                .ToArray();

            draws.Add(new Draw
            {
                Id = Guid.NewGuid(),
                GameId = Guid.NewGuid(),
                DrawDate = DateTime.SpecifyKind(DateTime.Today.AddDays(-count + i).AddHours(13), DateTimeKind.Utc),
                DayOfWeek = (short)(i % 7),
                Number1 = nums[0],
                Number2 = nums[1],
                Number3 = nums[2],
                Number4 = nums[3],
                Number5 = nums[4],
                Number6 = nums[5],
                CreatedAt = DateTime.UtcNow
            });
        }
        return draws;
    }

    [Fact]
    public async Task GeneratePrediction_WithNoDraws_ReturnsDefaultNumbers()
    {
        _drawRepository.GetAllByGameAsync(_gameId, Arg.Any<CancellationToken>())
            .Returns(new List<Draw>());

        var result = await _sut.GeneratePredictionAsync(_gameId, "frequency");

        result.Numbers.Should().BeEquivalentTo(new short[] { 1, 2, 3, 4, 5, 6 });
        result.ConfidenceScore.Should().Be(0);
        result.Reasoning.Should().Contain("No historical data");
    }

    [Theory]
    [InlineData("frequency")]
    [InlineData("hotcold")]
    [InlineData("hot_cold")]
    [InlineData("gap")]
    [InlineData("aiweighted")]
    [InlineData("ai_weighted")]
    [InlineData("combined")]
    public async Task GeneratePrediction_AllStrategies_Returns6UniqueNumbersInRange(string strategy)
    {
        var draws = CreateDraws(100);
        _drawRepository.GetAllByGameAsync(_gameId, Arg.Any<CancellationToken>())
            .Returns(draws);

        var result = await _sut.GeneratePredictionAsync(_gameId, strategy);

        result.Numbers.Should().HaveCount(6);
        result.Numbers.Should().OnlyContain(n => n >= 1 && n <= 42);
        result.Numbers.Should().OnlyHaveUniqueItems();
        result.Numbers.Should().BeInAscendingOrder();
    }

    [Theory]
    [InlineData("frequency")]
    [InlineData("hotcold")]
    [InlineData("gap")]
    [InlineData("aiweighted")]
    [InlineData("combined")]
    public async Task GeneratePrediction_AllStrategies_ReturnsPositiveConfidence(string strategy)
    {
        var draws = CreateDraws(100);
        _drawRepository.GetAllByGameAsync(_gameId, Arg.Any<CancellationToken>())
            .Returns(draws);

        var result = await _sut.GeneratePredictionAsync(_gameId, strategy);

        result.ConfidenceScore.Should().BeGreaterThan(0);
        result.ConfidenceScore.Should().BeLessThanOrEqualTo(100);
    }

    [Theory]
    [InlineData("frequency")]
    [InlineData("hotcold")]
    [InlineData("gap")]
    [InlineData("aiweighted")]
    [InlineData("combined")]
    public async Task GeneratePrediction_AllStrategies_ReturnsNonEmptyReasoning(string strategy)
    {
        var draws = CreateDraws(100);
        _drawRepository.GetAllByGameAsync(_gameId, Arg.Any<CancellationToken>())
            .Returns(draws);

        var result = await _sut.GeneratePredictionAsync(_gameId, strategy);

        result.Reasoning.Should().NotBeNullOrWhiteSpace();
        result.Strategy.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GeneratePrediction_UnknownStrategy_FallsToCombined()
    {
        var draws = CreateDraws(100);
        _drawRepository.GetAllByGameAsync(_gameId, Arg.Any<CancellationToken>())
            .Returns(draws);

        var result = await _sut.GeneratePredictionAsync(_gameId, "nonexistent");

        result.Strategy.Should().Be("Combined");
    }

    [Fact]
    public async Task GeneratePrediction_WithFewDraws_StillWorks()
    {
        var draws = CreateDraws(5);
        _drawRepository.GetAllByGameAsync(_gameId, Arg.Any<CancellationToken>())
            .Returns(draws);

        var result = await _sut.GeneratePredictionAsync(_gameId, "frequency");

        result.Numbers.Should().HaveCount(6);
        result.Numbers.Should().OnlyContain(n => n >= 1 && n <= 42);
    }

    [Fact]
    public async Task GeneratePrediction_ClaudeAi_WhenNotConfigured_FallsBackToCombined()
    {
        var draws = CreateDraws(100);
        _drawRepository.GetAllByGameAsync(_gameId, Arg.Any<CancellationToken>())
            .Returns(draws);
        _aiPredictionService.IsConfiguredAsync(Arg.Any<CancellationToken>())
            .Returns(false);

        var result = await _sut.GeneratePredictionAsync(_gameId, "claudeai");

        result.Strategy.Should().Be("Combined");
        result.Numbers.Should().HaveCount(6);
    }

    [Fact]
    public async Task GeneratePrediction_ClaudeAi_WhenServiceThrows_FallsBackToCombined()
    {
        var draws = CreateDraws(100);
        _drawRepository.GetAllByGameAsync(_gameId, Arg.Any<CancellationToken>())
            .Returns(draws);
        _aiPredictionService.IsConfiguredAsync(Arg.Any<CancellationToken>())
            .Returns(true);
        _aiPredictionService.GeneratePredictionAsync(Arg.Any<IReadOnlyList<Draw>>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("API error"));

        var result = await _sut.GeneratePredictionAsync(_gameId, "claudeai");

        result.Strategy.Should().Be("Combined");
        result.Numbers.Should().HaveCount(6);
    }
}
