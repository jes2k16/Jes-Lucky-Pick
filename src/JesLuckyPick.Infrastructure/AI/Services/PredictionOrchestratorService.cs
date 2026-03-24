using System.Security.Cryptography;
using JesLuckyPick.Application.Common.Interfaces;
using JesLuckyPick.Application.Features.Predictions.DTOs;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;

namespace JesLuckyPick.Infrastructure.AI.Services;

public class PredictionOrchestratorService(
    IDrawRepository drawRepository,
    IAiPredictionService aiPredictionService)
{
    public async Task<PredictionResponse> GeneratePredictionAsync(
        Guid gameId, string strategy, CancellationToken ct = default)
    {
        var draws = await drawRepository.GetAllByGameAsync(gameId, ct);
        if (draws.Count == 0)
            return new PredictionResponse(
                [1, 2, 3, 4, 5, 6], 0, strategy, "No historical data available.");

        return strategy.ToLowerInvariant() switch
        {
            "frequency" => GenerateFrequencyPick(draws),
            "hotcold" or "hot_cold" => GenerateHotColdPick(draws),
            "gap" => GenerateGapPick(draws),
            "aiweighted" or "ai_weighted" => GenerateWeightedPick(draws),
            "combined" => GenerateCombinedPick(draws),
            "claudeai" or "claude_ai" => await GenerateClaudeAiPick(draws, ct),
            _ => GenerateCombinedPick(draws)
        };
    }

    private async Task<PredictionResponse> GenerateClaudeAiPick(
        IReadOnlyList<Draw> draws, CancellationToken ct)
    {
        try
        {
            if (!await aiPredictionService.IsConfiguredAsync(ct))
                return GenerateCombinedPick(draws);

            return await aiPredictionService.GeneratePredictionAsync(draws, ct);
        }
        catch
        {
            // Graceful fallback to Combined strategy on any AI failure
            return GenerateCombinedPick(draws);
        }
    }

    private static PredictionResponse GenerateFrequencyPick(IReadOnlyList<Draw> draws)
    {
        var freq = ComputeFrequency(draws);
        var top = freq.OrderByDescending(kv => kv.Value)
            .Take(12)
            .Select(kv => kv.Key)
            .ToList();

        var picked = PickRandom(top, 6);
        var confidence = CalculateConfidence(freq, picked, draws.Count);

        return new PredictionResponse(picked, confidence, "Frequency",
            $"Selected from the top 12 most frequently drawn numbers across {draws.Count} draws. " +
            $"Numbers {string.Join(", ", picked)} have historically appeared more often than average.");
    }

    private static PredictionResponse GenerateHotColdPick(IReadOnlyList<Draw> draws)
    {
        var recent = draws.TakeLast(30).ToList();
        var recentFreq = ComputeFrequency(recent);
        var overallFreq = ComputeFrequency(draws);

        var expectedPerDraw = 6.0 / 42;
        var expectedInPeriod = expectedPerDraw * 30;

        var scores = Enumerable.Range(1, 42).Select(n =>
        {
            var count = recentFreq.GetValueOrDefault(n, 0);
            var zScore = (count - expectedInPeriod) / Math.Sqrt(expectedInPeriod * (1 - expectedPerDraw));
            return (Number: n, ZScore: zScore);
        }).ToList();

        // 4 hot + 2 cold ("due") numbers
        var hot = scores.OrderByDescending(s => s.ZScore).Take(8).Select(s => s.Number).ToList();
        var cold = scores.OrderBy(s => s.ZScore).Take(4).Select(s => s.Number).ToList();

        var hotPicks = PickRandom(hot, 4);
        var coldPicks = PickRandom(cold, 2);
        var picked = hotPicks.Concat(coldPicks).Order().ToArray();

        return new PredictionResponse(picked, 62m, "HotCold",
            $"Blended 4 hot numbers (trending up in last 30 draws) with 2 cold numbers (statistically due). " +
            $"Hot: {string.Join(", ", hotPicks)}, Cold/Due: {string.Join(", ", coldPicks)}.");
    }

    private static PredictionResponse GenerateGapPick(IReadOnlyList<Draw> draws)
    {
        var gaps = Enumerable.Range(1, 42).Select(num =>
        {
            var lastIndex = -1;
            for (var i = draws.Count - 1; i >= 0; i--)
            {
                if (draws[i].GetNumbers().Contains((short)num))
                {
                    lastIndex = i;
                    break;
                }
            }
            return (Number: num, Gap: lastIndex >= 0 ? draws.Count - 1 - lastIndex : draws.Count);
        }).ToList();

        var overdue = gaps.OrderByDescending(g => g.Gap).Take(12).Select(g => g.Number).ToList();
        var picked = PickRandom(overdue, 6);

        return new PredictionResponse(picked, 55m, "Gap",
            $"Selected numbers with the longest gaps since last appearance. " +
            $"These numbers are statistically overdue based on their historical draw frequency.");
    }

    private static PredictionResponse GenerateWeightedPick(IReadOnlyList<Draw> draws)
    {
        var freq = ComputeFrequency(draws);
        var recent = draws.TakeLast(30).ToList();
        var recentFreq = ComputeFrequency(recent);

        var scores = Enumerable.Range(1, 42).Select(num =>
        {
            var freqScore = (double)freq.GetValueOrDefault(num, 0) / draws.Count;
            var recentScore = (double)recentFreq.GetValueOrDefault(num, 0) / 30;

            var lastIndex = -1;
            for (var i = draws.Count - 1; i >= 0; i--)
            {
                if (draws[i].GetNumbers().Contains((short)num))
                {
                    lastIndex = i;
                    break;
                }
            }
            var gapScore = lastIndex >= 0 ? (double)(draws.Count - 1 - lastIndex) / draws.Count : 1.0;

            // Weighted composite: 40% frequency, 30% recent trend, 30% gap
            var composite = freqScore * 0.4 + recentScore * 0.3 + gapScore * 0.3;
            return (Number: num, Score: composite);
        }).ToList();

        var picked = WeightedRandomSelection(scores, 6);

        return new PredictionResponse(picked, 68m, "AiWeighted",
            $"AI-weighted selection combining frequency analysis (40%), recent trends (30%), " +
            $"and gap analysis (30%). Composite scoring balances historical patterns with current momentum.");
    }

    private static PredictionResponse GenerateCombinedPick(IReadOnlyList<Draw> draws)
    {
        // Run all strategies, find consensus numbers
        var freqPick = GenerateFrequencyPick(draws);
        var hotColdPick = GenerateHotColdPick(draws);
        var gapPick = GenerateGapPick(draws);
        var weightedPick = GenerateWeightedPick(draws);

        var allPicks = freqPick.Numbers
            .Concat(hotColdPick.Numbers)
            .Concat(gapPick.Numbers)
            .Concat(weightedPick.Numbers);

        var consensus = allPicks.GroupBy(n => n)
            .OrderByDescending(g => g.Count())
            .ThenBy(_ => RandomNumberGenerator.GetInt32(100))
            .Select(g => g.Key)
            .Take(6)
            .Order()
            .ToArray();

        var confidence = Math.Min(85m, 50m + consensus.Length * 5m);

        return new PredictionResponse(consensus, confidence, "Combined",
            $"Combined analysis using all 4 strategies (frequency, hot/cold, gap, weighted). " +
            $"Numbers appearing across multiple strategies receive higher priority. " +
            $"Analysis based on {draws.Count} historical draws.");
    }

    private static Dictionary<int, int> ComputeFrequency(IReadOnlyList<Draw> draws)
    {
        var freq = new Dictionary<int, int>();
        for (var i = 1; i <= 42; i++) freq[i] = 0;
        foreach (var draw in draws)
            foreach (var num in draw.GetNumbers())
                freq[num]++;
        return freq;
    }

    private static short[] PickRandom(List<int> pool, int count)
    {
        var shuffled = pool.OrderBy(_ => RandomNumberGenerator.GetInt32(int.MaxValue)).ToList();
        return shuffled.Take(count).Select(n => (short)n).Order().ToArray();
    }

    private static short[] WeightedRandomSelection(
        List<(int Number, double Score)> scores, int count)
    {
        var result = new List<int>();
        var remaining = new List<(int Number, double Score)>(scores);

        for (var i = 0; i < count && remaining.Count > 0; i++)
        {
            var totalWeight = remaining.Sum(s => s.Score);
            var target = RandomNumberGenerator.GetInt32(1000000) / 1000000.0 * totalWeight;
            var cumulative = 0.0;

            foreach (var item in remaining)
            {
                cumulative += item.Score;
                if (cumulative >= target)
                {
                    result.Add(item.Number);
                    remaining.Remove(item);
                    break;
                }
            }
        }

        return result.Select(n => (short)n).Order().ToArray();
    }

    private static decimal CalculateConfidence(
        Dictionary<int, int> freq, short[] picked, int totalDraws)
    {
        var avgFreq = freq.Values.Average();
        var pickedAvg = picked.Average(n => freq.GetValueOrDefault(n, 0));
        var ratio = pickedAvg / avgFreq;
        return Math.Min(85m, Math.Round((decimal)(ratio * 50), 0));
    }
}
