using System.Text.Json;

namespace JesLuckyPick.Infrastructure.Training;

/// <summary>
/// C# port of the TypeScript simulation strategies in
/// src/jes-lucky-pick-client/src/features/ai-training/utils/strategies.ts
/// and the core tick logic from useGameEngine.ts.
/// </summary>
public class GameSimulatorService
{
    private static readonly Random Rng = new();

    // Mirrors DEFAULT_SETTINGS.simulationSpeedMs in
    // src/jes-lucky-pick-client/src/features/ai-training/types/game.ts
    private const int DefaultSimulationSpeedMs = 500;

    // ── Public entry point ────────────────────────────────────────────────────

    public SimulationResult RunSimulation(ScheduledGameSettings settings, int[][] historicalDraws)
    {
        var managers = CreateManagers(settings, historicalDraws);
        int currentRound = 1;
        var timeLimitMinutes = settings.TimeLimitMinutes > 0 ? settings.TimeLimitMinutes : 1;
        var maxRounds = timeLimitMinutes * 60 * 1000 / DefaultSimulationSpeedMs / 6;
        if (maxRounds < 1) maxRounds = 1;

        while (currentRound <= maxRounds)
        {
            // Run all 6 tries for this round
            for (int tryNum = 1; tryNum <= 6; tryNum++)
            {
                foreach (var manager in managers.Where(m => m.Status == "active"))
                {
                    foreach (var expert in manager.Experts.Where(e => e.Status == "active"))
                    {
                        var guess = ExecuteStrategy(expert, settings, tryNum);
                        var stars = ScoreGuess(guess, manager.SecretCombination);

                        expert.TryHistory.Add(new TryResult(currentRound, tryNum, guess, stars));
                        expert.RoundHistory.Add(new TryResult(currentRound, tryNum, guess, stars));
                        UpdateConfidenceMap(expert, guess, stars);

                        if (stars > expert.CurrentRoundScore)
                            expert.CurrentRoundScore = stars;

                        // Win condition: 5+ stars
                        if (stars >= 5)
                        {
                            expert.Status = "winner";
                            manager.Status = "winner";

                            var winnerJson = JsonSerializer.Serialize(new
                            {
                                managerId = manager.Id,
                                managerSecretCombination = manager.SecretCombination,
                                expertId = expert.Id,
                                expertName = expert.Name,
                                expertPersonality = expert.Personality,
                                winningGuess = guess,
                                winningStars = stars,
                                roundsPlayed = currentRound,
                                totalTries = expert.TryHistory.Count
                            });

                            var winnerTicks = (currentRound - 1) * 6 + tryNum;
                            return new SimulationResult(
                                Result: "winner_found",
                                TotalRounds: currentRound,
                                TotalExperts: managers.Sum(m => m.Experts.Length),
                                SurvivingExperts: managers.SelectMany(m => m.Experts).Count(e => e.Status == "active" || e.Status == "winner"),
                                DurationSeconds: Math.Max(1, winnerTicks * DefaultSimulationSpeedMs / 1000),
                                WinnerJson: winnerJson,
                                LeaderboardJson: BuildLeaderboard(managers),
                                SettingsJson: JsonSerializer.Serialize(settings)
                            );
                        }
                    }
                }
            }

            // End of round — eliminate experts with score < 2
            bool anyAlive = false;
            foreach (var manager in managers.Where(m => m.Status == "active"))
            {
                foreach (var expert in manager.Experts.Where(e => e.Status == "active"))
                {
                    expert.RoundScores.Add(expert.CurrentRoundScore);
                    if (expert.CurrentRoundScore < 2)
                        expert.Status = "eliminated";
                }

                if (manager.Experts.All(e => e.Status != "active"))
                    manager.Status = "failed";
                else
                    anyAlive = true;

                // Reset for next round
                foreach (var expert in manager.Experts.Where(e => e.Status == "active"))
                {
                    expert.RoundHistory.Clear();
                    expert.CurrentRoundScore = 0;
                }
            }

            if (!anyAlive)
            {
                return new SimulationResult(
                    Result: "all_eliminated",
                    TotalRounds: currentRound,
                    TotalExperts: managers.Sum(m => m.Experts.Length),
                    SurvivingExperts: 0,
                    DurationSeconds: Math.Max(1, currentRound * 6 * DefaultSimulationSpeedMs / 1000),
                    WinnerJson: null,
                    LeaderboardJson: BuildLeaderboard(managers),
                    SettingsJson: JsonSerializer.Serialize(settings)
                );
            }

            currentRound++;
        }

        return new SimulationResult(
            Result: "time_up",
            TotalRounds: currentRound - 1,
            TotalExperts: managers.Sum(m => m.Experts.Length),
            SurvivingExperts: managers.SelectMany(m => m.Experts).Count(e => e.Status == "active"),
            DurationSeconds: timeLimitMinutes * 60,
            WinnerJson: null,
            LeaderboardJson: BuildLeaderboard(managers),
            SettingsJson: JsonSerializer.Serialize(settings)
        );
    }

    // ── Manager / Expert creation ─────────────────────────────────────────────

    private static SimManager[] CreateManagers(ScheduledGameSettings settings, int[][] historicalDraws)
    {
        var personalities = new[] { "Scanner", "Sticky", "Gambler", "Analyst" };
        var expertNames = new[]
        {
            "Alpha","Bravo","Charlie","Delta","Echo","Foxtrot",
            "Golf","Hotel","India","Juliet","Kilo","Lima",
            "Mike","November","Oscar","Papa","Quebec","Romeo",
            "Sierra","Tango","Uniform","Victor","Whiskey","X-Ray"
        };

        var usedSecrets = new HashSet<string>();
        var usedNames = new HashSet<string>();
        int nameIdx = Rng.Next(expertNames.Length);
        var managers = new SimManager[settings.ManagerCount];

        for (int m = 0; m < settings.ManagerCount; m++)
        {
            var secret = PickSecret(historicalDraws, usedSecrets, settings);
            var experts = new SimExpert[settings.ExpertsPerManager];

            for (int e = 0; e < settings.ExpertsPerManager; e++)
            {
                var personality = personalities[e % personalities.Length];

                string name;
                do
                {
                    name = expertNames[nameIdx % expertNames.Length];
                    nameIdx++;
                } while (usedNames.Contains(name));
                usedNames.Add(name);

                var confidenceMap = new Dictionary<int, double>();
                for (int n = settings.NumberRangeMin; n <= settings.NumberRangeMax; n++)
                    confidenceMap[n] = 0;

                experts[e] = new SimExpert($"mgr{m}-exp{e}", name, personality, confidenceMap);
            }

            managers[m] = new SimManager($"mgr-{m + 1}", secret, experts);
        }

        return managers;
    }

    private static int[] PickSecret(int[][] historicalDraws, HashSet<string> used, ScheduledGameSettings settings)
    {
        if (historicalDraws.Length > 0)
        {
            var shuffled = historicalDraws.OrderBy(_ => Rng.Next()).ToArray();
            foreach (var draw in shuffled)
            {
                var key = string.Join(",", draw.OrderBy(x => x));
                if (used.Add(key)) return draw;
            }
            return shuffled[Rng.Next(shuffled.Length)];
        }
        return PickRandom(settings.NumberRangeMin, settings.NumberRangeMax, settings.CombinationSize, []);
    }

    // ── Strategies (mirrors strategies.ts) ───────────────────────────────────

    private static int[] ExecuteStrategy(SimExpert expert, ScheduledGameSettings settings, int tryNum)
    {
        var guess = expert.Personality switch
        {
            "Scanner" => ScannerStrategy(expert, settings, tryNum),
            "Sticky" => StickyStrategy(expert, settings, tryNum),
            "Gambler" => GamblerStrategy(expert, settings, tryNum),
            "Analyst" => AnalystStrategy(expert, settings, tryNum),
            _ => ScannerStrategy(expert, settings, tryNum)
        };

        // Ensure uniqueness and correct count
        var unique = guess.Distinct()
            .Where(n => n >= settings.NumberRangeMin && n <= settings.NumberRangeMax)
            .ToList();

        if (unique.Count < settings.CombinationSize)
        {
            var fill = PickRandom(settings.NumberRangeMin, settings.NumberRangeMax,
                settings.CombinationSize - unique.Count, unique.ToArray());
            unique.AddRange(fill);
        }

        return unique.Take(settings.CombinationSize).OrderBy(x => x).ToArray();
    }

    private static int[] ScannerStrategy(SimExpert expert, ScheduledGameSettings settings, int tryNum)
    {
        var size = settings.CombinationSize;

        if (tryNum <= 2)
        {
            var testedThisRound = expert.RoundHistory.SelectMany(t => t.Guess).ToHashSet();
            var untested = PickRandom(settings.NumberRangeMin, settings.NumberRangeMax, size, [.. testedThisRound]);
            if (untested.Length >= size) return untested;
            var fill = PickRandom(settings.NumberRangeMin, settings.NumberRangeMax, size - untested.Length, untested);
            return [.. untested, .. fill];
        }

        var best = GetBestTryThisRound(expert);
        if (tryNum <= 4)
        {
            if (best != null && best.Stars >= 2)
            {
                var keep = best.Guess[..best.Stars];
                var fill = PickRandom(settings.NumberRangeMin, settings.NumberRangeMax, size - keep.Length, keep);
                return [.. keep, .. fill];
            }
            return PickRandom(settings.NumberRangeMin, settings.NumberRangeMax, size, []);
        }

        if (best != null && best.Stars >= 3)
        {
            var keep = best.Guess[..Math.Min(best.Stars, size - 1)];
            var fill = PickTopConfidence(expert, settings, size - keep.Length, keep);
            return [.. keep, .. fill];
        }
        return PickTopConfidence(expert, settings, size, []);
    }

    private static int[] StickyStrategy(SimExpert expert, ScheduledGameSettings settings, int tryNum)
    {
        var size = settings.CombinationSize;

        if (tryNum == 1)
        {
            var top = PickTopConfidence(expert, settings, size, []);
            return top.Any(n => expert.ConfidenceMap[n] > 0)
                ? top
                : PickRandom(settings.NumberRangeMin, settings.NumberRangeMax, size, []);
        }

        var best = GetBestTryThisRound(expert);
        if (best != null && best.Stars >= 1)
        {
            var swapCount = Math.Max(1, size - best.Stars);
            var keep = best.Guess[..(size - swapCount)];
            var fill = PickRandom(settings.NumberRangeMin, settings.NumberRangeMax, swapCount, keep);
            return [.. keep, .. fill];
        }
        return PickRandom(settings.NumberRangeMin, settings.NumberRangeMax, size, []);
    }

    private static int[] GamblerStrategy(SimExpert expert, ScheduledGameSettings settings, int tryNum)
    {
        var size = settings.CombinationSize;

        if (tryNum <= 4)
        {
            var best = GetBestTryThisRound(expert);
            if (best != null && best.Stars >= 1)
            {
                var keepCount = Rng.Next(3); // 0, 1, or 2
                var shuffled = best.Guess.OrderBy(_ => Rng.Next()).ToArray();
                var keep = shuffled[..keepCount];
                var fill = PickRandom(settings.NumberRangeMin, settings.NumberRangeMax, size - keep.Length, keep);
                return [.. keep, .. fill];
            }
            return PickRandom(settings.NumberRangeMin, settings.NumberRangeMax, size, []);
        }

        if (Rng.NextDouble() > 0.5)
            return PickTopConfidence(expert, settings, size, []);

        var b = GetBestTryThisRound(expert);
        if (b != null)
        {
            var keep = b.Guess[..(size / 2)];
            var fill = PickRandom(settings.NumberRangeMin, settings.NumberRangeMax, size - keep.Length, keep);
            return [.. keep, .. fill];
        }
        return PickRandom(settings.NumberRangeMin, settings.NumberRangeMax, size, []);
    }

    private static int[] AnalystStrategy(SimExpert expert, ScheduledGameSettings settings, int tryNum)
    {
        var size = settings.CombinationSize;
        var rangeSize = settings.NumberRangeMax - settings.NumberRangeMin + 1;
        var sectionSize = (int)Math.Ceiling((double)rangeSize / size);

        if (tryNum <= 2)
        {
            var guess = new List<int>();
            for (int i = 0; i < size; i++)
            {
                var start = settings.NumberRangeMin + i * sectionSize;
                var end = Math.Min(start + sectionSize - 1, settings.NumberRangeMax);
                guess.Add(start + Rng.Next(end - start + 1));
            }
            return guess.Distinct().Count() == size
                ? guess.ToArray()
                : PickRandom(settings.NumberRangeMin, settings.NumberRangeMax, size, []);
        }

        if (tryNum <= 4)
        {
            var best = GetBestTryThisRound(expert);
            if (best != null && best.Stars >= 2)
            {
                var keep = best.Guess[..best.Stars].ToList();
                var random = PickRandom(settings.NumberRangeMin, settings.NumberRangeMax,
                    size - keep.Count, [.. keep]);
                return [.. keep, .. random];
            }
            return PickRandom(settings.NumberRangeMin, settings.NumberRangeMax, size, []);
        }

        return PickTopConfidence(expert, settings, size, []);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static int ScoreGuess(int[] guess, int[] secret)
    {
        var secretSet = new HashSet<int>(secret);
        return guess.Count(secretSet.Contains);
    }

    private static void UpdateConfidenceMap(SimExpert expert, int[] guess, int stars)
    {
        var delta = stars >= 3 ? 0.3 : stars == 0 ? -0.2 : 0.05;
        foreach (var n in guess)
        {
            expert.ConfidenceMap.TryGetValue(n, out var current);
            expert.ConfidenceMap[n] = current + delta;
        }
    }

    private static int[] PickRandom(int min, int max, int count, int[] exclude)
    {
        var pool = Enumerable.Range(min, max - min + 1).Except(exclude).ToList();
        var result = new List<int>();
        while (result.Count < count && pool.Count > 0)
        {
            var idx = Rng.Next(pool.Count);
            result.Add(pool[idx]);
            pool.RemoveAt(idx);
        }
        return [.. result];
    }

    private static int[] PickTopConfidence(SimExpert expert, ScheduledGameSettings settings, int count, int[] exclude)
    {
        return Enumerable.Range(settings.NumberRangeMin, settings.NumberRangeMax - settings.NumberRangeMin + 1)
            .Where(n => !exclude.Contains(n))
            .OrderByDescending(n => expert.ConfidenceMap.GetValueOrDefault(n))
            .Take(count)
            .ToArray();
    }

    private static TryResult? GetBestTryThisRound(SimExpert expert) =>
        expert.RoundHistory.Count == 0 ? null : expert.RoundHistory.MaxBy(t => t.Stars);

    private static string BuildLeaderboard(SimManager[] managers)
    {
        var entries = managers
            .SelectMany(m => m.Experts)
            .Where(e => e.TryHistory.Count > 0)
            .Select(e => new
            {
                expertName = e.Name,
                personality = e.Personality,
                status = e.Status,
                bestScore = e.RoundScores.Count > 0 ? e.RoundScores.Max() : 0,
                totalTries = e.TryHistory.Count
            })
            .OrderByDescending(x => x.bestScore)
            .ThenByDescending(x => x.status == "winner")
            .ToList();

        return JsonSerializer.Serialize(entries);
    }
}

// ── Internal simulation models ────────────────────────────────────────────────

internal class SimManager(string id, int[] secret, SimExpert[] experts)
{
    public string Id { get; } = id;
    public int[] SecretCombination { get; } = secret;
    public SimExpert[] Experts { get; } = experts;
    public string Status { get; set; } = "active";
}

internal class SimExpert(string id, string name, string personality, Dictionary<int, double> confidenceMap)
{
    public string Id { get; } = id;
    public string Name { get; } = name;
    public string Personality { get; } = personality;
    public Dictionary<int, double> ConfidenceMap { get; } = confidenceMap;
    public string Status { get; set; } = "active";
    public List<TryResult> TryHistory { get; } = [];
    public List<TryResult> RoundHistory { get; } = [];
    public List<int> RoundScores { get; } = [];
    public int CurrentRoundScore { get; set; }
}

internal record TryResult(int Round, int TryNumber, int[] Guess, int Stars);

public record SimulationResult(
    string Result,
    int TotalRounds,
    int TotalExperts,
    int SurvivingExperts,
    int DurationSeconds,
    string? WinnerJson,
    string LeaderboardJson,
    string SettingsJson);

public record ScheduledGameSettings(
    string LottoGame,
    int ManagerCount,
    int ExpertsPerManager,
    int TimeLimitMinutes,
    int CombinationSize,
    int NumberRangeMin,
    int NumberRangeMax,
    bool UseVeterans);
