using JesLuckyPick.Application.Features.Analysis.DTOs;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;

namespace JesLuckyPick.Api.Endpoints;

public static class AnalysisEndpoints
{
    public static void MapAnalysisEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/analysis").RequireAuthorization();

        group.MapGet("/frequency", async (
            IDrawRepository drawRepo,
            ILottoGameRepository gameRepo,
            string gameCode = "6_42") =>
        {
            var game = await gameRepo.GetByCodeAsync(gameCode);
            if (game is null) return Results.NotFound("Game not found.");

            var draws = await drawRepo.GetAllByGameAsync(game.Id);
            var totalDraws = draws.Count;
            var frequency = GetFrequency(draws, game.MaxNumber);

            return Results.Ok(frequency.Select(kv => new FrequencyDto(
                kv.Key, kv.Value, Math.Round((double)kv.Value / totalDraws * 100, 2)))
                .OrderByDescending(f => f.Count));
        });

        group.MapGet("/hot-cold", async (
            IDrawRepository drawRepo,
            ILottoGameRepository gameRepo,
            string gameCode = "6_42",
            int period = 30) =>
        {
            var game = await gameRepo.GetByCodeAsync(gameCode);
            if (game is null) return Results.NotFound("Game not found.");

            var allDraws = await drawRepo.GetAllByGameAsync(game.Id);
            var recentDraws = allDraws.TakeLast(period).ToList();

            var recentFreq = GetFrequency(recentDraws, game.MaxNumber);
            var overallFreq = GetFrequency(allDraws, game.MaxNumber);

            var expectedPerDraw = (double)game.PickCount / game.MaxNumber;
            var expectedInPeriod = expectedPerDraw * period;
            var stdDev = Math.Sqrt(expectedInPeriod * (1 - expectedPerDraw));

            var scores = new List<NumberScore>();
            for (var num = 1; num <= game.MaxNumber; num++)
            {
                var count = recentFreq.GetValueOrDefault(num, 0);
                var zScore = stdDev > 0 ? (count - expectedInPeriod) / stdDev : 0;
                scores.Add(new NumberScore(num, count, Math.Round(zScore, 2)));
            }

            return Results.Ok(new HotColdDto(
                scores.OrderByDescending(s => s.ZScore).Take(10).ToList(),
                scores.OrderBy(s => s.ZScore).Take(10).ToList(),
                period));
        });

        group.MapGet("/gap", async (
            IDrawRepository drawRepo,
            ILottoGameRepository gameRepo,
            string gameCode = "6_42") =>
        {
            var game = await gameRepo.GetByCodeAsync(gameCode);
            if (game is null) return Results.NotFound("Game not found.");

            var draws = await drawRepo.GetAllByGameAsync(game.Id);
            var totalDraws = draws.Count;
            var gaps = new List<GapDto>();

            for (var num = 1; num <= game.MaxNumber; num++)
            {
                var lastIndex = -1;
                var gapSum = 0;
                var gapCount = 0;

                for (var i = 0; i < draws.Count; i++)
                {
                    if (draws[i].GetNumbers().Contains((short)num))
                    {
                        if (lastIndex >= 0)
                        {
                            gapSum += i - lastIndex;
                            gapCount++;
                        }
                        lastIndex = i;
                    }
                }

                var currentGap = lastIndex >= 0 ? totalDraws - 1 - lastIndex : totalDraws;
                var avgGap = gapCount > 0 ? Math.Round((double)gapSum / gapCount, 1) : 0;
                gaps.Add(new GapDto(num, currentGap, avgGap));
            }

            return Results.Ok(gaps.OrderByDescending(g => g.CurrentGap));
        });

        group.MapGet("/patterns", async (
            IDrawRepository drawRepo,
            ILottoGameRepository gameRepo,
            string gameCode = "6_42") =>
        {
            var game = await gameRepo.GetByCodeAsync(gameCode);
            if (game is null) return Results.NotFound("Game not found.");

            var draws = await drawRepo.GetAllByGameAsync(game.Id);
            var totalDraws = draws.Count;

            // Odd/Even distribution
            var oddEven = draws.GroupBy(d =>
            {
                var nums = d.GetNumbers();
                var odds = nums.Count(n => n % 2 != 0);
                return $"{odds}O/{6 - odds}E";
            })
            .Select(g => new OddEvenDistribution(
                g.Key, g.Count(), Math.Round((double)g.Count() / totalDraws * 100, 1)))
            .OrderByDescending(x => x.Count)
            .ToList();

            // Sum range distribution
            var sumRanges = draws.GroupBy(d =>
            {
                var sum = d.GetNumbers().Sum(n => (int)n);
                return sum switch
                {
                    < 80 => "21-79",
                    < 110 => "80-109",
                    < 140 => "110-139",
                    < 170 => "140-169",
                    _ => "170+"
                };
            })
            .Select(g => new SumRangeDistribution(
                g.Key, g.Count(), Math.Round((double)g.Count() / totalDraws * 100, 1)))
            .OrderBy(x => x.Range)
            .ToList();

            // Decade distribution
            var decades = new[] { "1-10", "11-20", "21-30", "31-42" };
            var decadeDist = decades.Select(decade =>
            {
                var (lo, hi) = decade switch
                {
                    "1-10" => (1, 10),
                    "11-20" => (11, 20),
                    "21-30" => (21, 30),
                    _ => (31, 42)
                };
                var avg = draws.Average(d =>
                    d.GetNumbers().Count(n => n >= lo && n <= hi));
                return new DecadeDistribution(decade, Math.Round(avg, 2));
            }).ToList();

            return Results.Ok(new PatternDto(oddEven, sumRanges, decadeDist));
        });
    }

    private static Dictionary<int, int> GetFrequency(IReadOnlyList<Draw> draws, int maxNumber)
    {
        var freq = new Dictionary<int, int>();
        for (var i = 1; i <= maxNumber; i++) freq[i] = 0;

        foreach (var draw in draws)
            foreach (var num in draw.GetNumbers())
                freq[num]++;

        return freq;
    }
}
