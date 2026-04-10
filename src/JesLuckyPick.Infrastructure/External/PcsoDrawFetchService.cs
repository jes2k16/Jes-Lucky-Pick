using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using JesLuckyPick.Application.Common.Interfaces;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace JesLuckyPick.Infrastructure.External;

public partial class PcsoDrawFetchService(
    HttpClient httpClient,
    IDrawRepository drawRepo,
    ILottoGameRepository gameRepo,
    ILogger<PcsoDrawFetchService> logger) : IDrawFetchService
{
    // WordPress category IDs on lottopcso.com
    private static readonly Dictionary<string, int> GameCategoryMap = new()
    {
        ["6_42"] = 3,
        ["6_45"] = 4,
        ["6_49"] = 5,
        ["6_55"] = 6,
        ["6_58"] = 7,
    };

    private static readonly Dictionary<string, string> GameLabelMap = new()
    {
        ["6_42"] = "6/42 Lotto",
        ["6_45"] = "6/45 Megalotto",
        ["6_49"] = "6/49 Superlotto",
        ["6_55"] = "6/55 Grandlotto",
        ["6_58"] = "6/58 Ultralotto",
    };

    public async Task<DrawSyncResult> FetchLatestDrawsAsync(
        string gameCode, CancellationToken ct = default)
    {
        var game = await gameRepo.GetByCodeAsync(gameCode, ct);
        if (game is null)
            throw new InvalidOperationException($"Game '{gameCode}' not found.");

        var latestDraws = await drawRepo.GetLatestAsync(game.Id, 1, ct);
        var latestDate = latestDraws.Count > 0
            ? latestDraws[0].DrawDate
            : DateTime.MinValue;

        if (!GameCategoryMap.TryGetValue(gameCode, out var categoryId))
            throw new InvalidOperationException($"Unsupported game code '{gameCode}' for fetch.");

        try
        {
            var posts = await FetchPostsAsync(categoryId, ct);
            var draws = ParseDrawsFromPosts(posts, gameCode, game.Id);

            // 1. Find new draws to add
            var newDraws = draws
                .Where(d => d.DrawDate > latestDate)
                .OrderBy(d => d.DrawDate)
                .ToList();

            // 2. Sync last 4 existing draws — check if numbers/jackpot/winners differ
            var updatedDraws = new List<Draw>();
            var existingDraws = draws
                .Where(d => d.DrawDate <= latestDate)
                .ToList();

            foreach (var fetched in existingDraws)
            {
                var existing = await drawRepo.GetByGameAndDateAsync(game.Id, fetched.DrawDate, ct);
                if (existing is null) continue;

                var numbersChanged =
                    existing.Number1 != fetched.Number1 || existing.Number2 != fetched.Number2 ||
                    existing.Number3 != fetched.Number3 || existing.Number4 != fetched.Number4 ||
                    existing.Number5 != fetched.Number5 || existing.Number6 != fetched.Number6;
                var jackpotChanged = existing.JackpotAmount != fetched.JackpotAmount;
                var winnersChanged = existing.WinnersCount != fetched.WinnersCount;

                if (numbersChanged || jackpotChanged || winnersChanged)
                {
                    existing.Number1 = fetched.Number1;
                    existing.Number2 = fetched.Number2;
                    existing.Number3 = fetched.Number3;
                    existing.Number4 = fetched.Number4;
                    existing.Number5 = fetched.Number5;
                    existing.Number6 = fetched.Number6;
                    existing.JackpotAmount = fetched.JackpotAmount;
                    existing.WinnersCount = fetched.WinnersCount;
                    await drawRepo.UpdateAsync(existing, ct);
                    updatedDraws.Add(existing);
                }
            }

            logger.LogInformation(
                "Fetched {TotalCount} draws for {GameCode}, {NewCount} new, {UpdatedCount} updated (after {LatestDate})",
                draws.Count, gameCode, newDraws.Count, updatedDraws.Count, latestDate);

            return new DrawSyncResult(newDraws, updatedDraws);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch draws for game {GameCode}", gameCode);
            throw new InvalidOperationException(
                $"Failed to fetch latest results: {ex.Message}", ex);
        }
    }

    private async Task<JsonElement[]> FetchPostsAsync(int categoryId, CancellationToken ct)
    {
        // Fetch recent posts from lottopcso.com WordPress REST API
        var url = $"https://www.lottopcso.com/wp-json/wp/v2/posts?categories={categoryId}&per_page=20&page=1&_fields=id,date,title,content";

        httpClient.DefaultRequestHeaders.UserAgent.ParseAdd(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

        var response = await httpClient.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);

        return doc.RootElement.EnumerateArray()
            .Select(e => e.Clone())
            .ToArray();
    }

    internal static List<Draw> ParseDrawsFromPosts(JsonElement[] posts, string gameCode, Guid gameId)
    {
        var draws = new List<Draw>();
        var gameLabel = GameLabelMap.GetValueOrDefault(gameCode, "");

        foreach (var post in posts)
        {
            var content = post.GetProperty("content").GetProperty("rendered").GetString() ?? "";
            var postDate = post.GetProperty("date").GetString() ?? "";

            // Extract draw date from the post date (WordPress ISO format)
            if (!DateTime.TryParse(postDate, CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var parsedDate))
                continue;
            var drawDate = DateTime.SpecifyKind(parsedDate.Date.AddHours(13), DateTimeKind.Utc);

            // Extract winning combination: "Winning Combination</td><td...>XX-XX-XX-XX-XX-XX"
            var comboMatch = WinningCombinationRegex().Match(content);
            if (!comboMatch.Success)
            {
                // Fallback: "Winning Numbers: XX-XX-XX-XX-XX-XX"
                comboMatch = WinningNumbersFallbackRegex().Match(content);
                if (!comboMatch.Success) continue;
            }

            var combination = comboMatch.Groups[1].Value.Trim();
            var numberStrings = combination.Split('-', StringSplitOptions.RemoveEmptyEntries);
            if (numberStrings.Length != 6) continue;

            var numbers = new short[6];
            var valid = true;
            for (var i = 0; i < 6; i++)
            {
                if (!short.TryParse(numberStrings[i].Trim(), out numbers[i]))
                {
                    valid = false;
                    break;
                }
            }
            if (!valid) continue;

            Array.Sort(numbers);

            // Extract jackpot: "Jackpot Prize</td><td...>₱10,000,000.00"
            decimal? jackpot = null;
            var jackpotMatch = JackpotRegex().Match(content);
            if (jackpotMatch.Success)
            {
                var jackpotStr = StripHtml(jackpotMatch.Groups[1].Value)
                    .Replace(",", "").Replace("₱", "").Replace("PHP", "")
                    .Replace("\u20b1", "").Trim();
                if (decimal.TryParse(jackpotStr, NumberStyles.Number,
                        CultureInfo.InvariantCulture, out var j) && j > 0)
                    jackpot = j;
            }

            // Extract winners: "Jackpot Winner (6 out of 6)</td><td...>1"
            int? winners = null;
            var winnersMatch = WinnersRegex().Match(content);
            if (winnersMatch.Success)
            {
                var winnersStr = StripHtml(winnersMatch.Groups[1].Value).Trim();
                if (int.TryParse(winnersStr, out var w))
                    winners = w;
            }

            draws.Add(new Draw
            {
                Id = Guid.NewGuid(),
                GameId = gameId,
                DrawDate = drawDate,
                DayOfWeek = (short)drawDate.DayOfWeek,
                Number1 = numbers[0],
                Number2 = numbers[1],
                Number3 = numbers[2],
                Number4 = numbers[3],
                Number5 = numbers[4],
                Number6 = numbers[5],
                JackpotAmount = jackpot,
                WinnersCount = winners,
                CreatedAt = DateTime.UtcNow
            });
        }

        return draws;
    }

    private static string StripHtml(string input)
        => HtmlTagRegex().Replace(input, "").Trim();

    // Matches: Winning Combination</td><td...>XX-XX-XX-XX-XX-XX</td>
    [GeneratedRegex(@"Winning Combination<\/td>\s*<td[^>]*>(\d{1,2}-\d{1,2}-\d{1,2}-\d{1,2}-\d{1,2}-\d{1,2})", RegexOptions.IgnoreCase)]
    private static partial Regex WinningCombinationRegex();

    // Fallback: Winning Numbers: XX-XX-XX-XX-XX-XX
    [GeneratedRegex(@"Winning Numbers:\s*(\d{1,2}-\d{1,2}-\d{1,2}-\d{1,2}-\d{1,2}-\d{1,2})", RegexOptions.IgnoreCase)]
    private static partial Regex WinningNumbersFallbackRegex();

    // Matches: Jackpot Prize</td><td...>₱10,000,000.00</td>
    [GeneratedRegex(@"Jackpot Prize<\/td>\s*<td[^>]*>(.*?)<\/td>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex JackpotRegex();

    // Matches: Jackpot Winner (6 out of 6)</td><td...>1</td>
    [GeneratedRegex(@"Jackpot Winner[^<]*<\/td>\s*<td[^>]*>(.*?)<\/td>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex WinnersRegex();

    [GeneratedRegex(@"<[^>]+>")]
    private static partial Regex HtmlTagRegex();
}
