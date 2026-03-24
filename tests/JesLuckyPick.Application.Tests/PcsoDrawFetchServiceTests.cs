using System.Text.Json;
using FluentAssertions;
using JesLuckyPick.Infrastructure.External;

namespace JesLuckyPick.Application.Tests;

public class PcsoDrawFetchServiceTests
{
    private readonly Guid _gameId = Guid.NewGuid();

    /// <summary>
    /// Builds a WordPress REST API post JSON element with the given content and date.
    /// </summary>
    private static JsonElement BuildPost(string renderedContent, string date = "2026-03-20T21:00:00")
    {
        var json = JsonSerializer.Serialize(new
        {
            id = 1,
            date,
            title = new { rendered = "6/42 Lotto Result" },
            content = new { rendered = renderedContent }
        });
        return JsonDocument.Parse(json).RootElement.Clone();
    }

    private static string BuildTableContent(
        string combination,
        string? jackpot = null,
        string? winners = null)
    {
        var html = $"<table><tr><td>Winning Combination</td><td class=\"coltwo\">{combination}</td></tr>";
        if (jackpot is not null)
            html += $"<tr><td>Jackpot Prize</td><td class=\"coltwo\">{jackpot}</td></tr>";
        if (winners is not null)
            html += $"<tr><td>Jackpot Winner (6 out of 6)</td><td class=\"coltwo\">{winners}</td></tr>";
        html += "</table>";
        return html;
    }

    [Fact]
    public void ParseDrawsFromPosts_ValidPost_ReturnsDraw()
    {
        var content = BuildTableContent("01-12-23-31-38-42", "₱10,000,000.00", "0");
        var posts = new[] { BuildPost(content) };

        var draws = PcsoDrawFetchService.ParseDrawsFromPosts(posts, "6_42", _gameId);

        draws.Should().HaveCount(1);
        draws[0].GetNumbers().Should().BeEquivalentTo(new short[] { 1, 12, 23, 31, 38, 42 });
        draws[0].DrawDate.Should().Be(new DateTime(2026, 3, 20, 13, 0, 0, DateTimeKind.Utc));
        draws[0].JackpotAmount.Should().Be(10_000_000m);
        draws[0].WinnersCount.Should().Be(0);
        draws[0].GameId.Should().Be(_gameId);
    }

    [Fact]
    public void ParseDrawsFromPosts_MultiplePosts_ReturnsAll()
    {
        var posts = new[]
        {
            BuildPost(BuildTableContent("01-02-03-04-05-06"), "2026-03-18T21:00:00"),
            BuildPost(BuildTableContent("07-08-09-10-11-12"), "2026-03-20T21:00:00")
        };

        var draws = PcsoDrawFetchService.ParseDrawsFromPosts(posts, "6_42", _gameId);

        draws.Should().HaveCount(2);
    }

    [Fact]
    public void ParseDrawsFromPosts_InvalidNumbers_Skipped()
    {
        var content = BuildTableContent("abc-02-03-04-05-06");
        var posts = new[] { BuildPost(content) };

        var draws = PcsoDrawFetchService.ParseDrawsFromPosts(posts, "6_42", _gameId);

        draws.Should().BeEmpty();
    }

    [Fact]
    public void ParseDrawsFromPosts_InvalidDate_Skipped()
    {
        var content = BuildTableContent("01-02-03-04-05-06");
        var posts = new[] { BuildPost(content, "not-a-date") };

        var draws = PcsoDrawFetchService.ParseDrawsFromPosts(posts, "6_42", _gameId);

        draws.Should().BeEmpty();
    }

    [Fact]
    public void ParseDrawsFromPosts_NumbersAreSorted()
    {
        var content = BuildTableContent("42-01-23-12-38-31");
        var posts = new[] { BuildPost(content) };

        var draws = PcsoDrawFetchService.ParseDrawsFromPosts(posts, "6_42", _gameId);

        draws[0].GetNumbers().Should().BeInAscendingOrder();
    }

    [Fact]
    public void ParseDrawsFromPosts_EmptyArray_ReturnsEmpty()
    {
        var draws = PcsoDrawFetchService.ParseDrawsFromPosts([], "6_42", _gameId);

        draws.Should().BeEmpty();
    }

    [Fact]
    public void ParseDrawsFromPosts_NoJackpotOrWinners_NullValues()
    {
        var content = BuildTableContent("01-02-03-04-05-06");
        var posts = new[] { BuildPost(content) };

        var draws = PcsoDrawFetchService.ParseDrawsFromPosts(posts, "6_42", _gameId);

        draws[0].JackpotAmount.Should().BeNull();
        draws[0].WinnersCount.Should().BeNull();
    }

    [Fact]
    public void ParseDrawsFromPosts_FallbackWinningNumbers_Parsed()
    {
        // Test the fallback regex: "Winning Numbers: XX-XX-XX-XX-XX-XX"
        var content = "<p>Winning Numbers: 05-10-15-20-25-30</p>";
        var posts = new[] { BuildPost(content) };

        var draws = PcsoDrawFetchService.ParseDrawsFromPosts(posts, "6_42", _gameId);

        draws.Should().HaveCount(1);
        draws[0].GetNumbers().Should().BeEquivalentTo(new short[] { 5, 10, 15, 20, 25, 30 });
    }

    [Fact]
    public void ParseDrawsFromPosts_WrongNumberCount_Skipped()
    {
        // Only 5 numbers instead of 6
        var content = BuildTableContent("01-02-03-04-05");
        var posts = new[] { BuildPost(content) };

        var draws = PcsoDrawFetchService.ParseDrawsFromPosts(posts, "6_42", _gameId);

        draws.Should().BeEmpty();
    }
}
