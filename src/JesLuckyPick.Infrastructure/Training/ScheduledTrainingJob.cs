using System.Text.Json;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Enums;
using JesLuckyPick.Domain.Interfaces;

namespace JesLuckyPick.Infrastructure.Training;

public class ScheduledTrainingJob(
    ITrainingScheduleRepository scheduleRepo,
    IDrawRepository drawRepo,
    ILottoGameRepository gameRepo,
    IUserRepository userRepo,
    ITrainingSessionRepository sessionRepo,
    IExpertCareerRepository careerRepo,
    GameSimulatorService simulator)
{
    private const double DecayFactor = 0.7;
    private const double LearningRate = 0.3;
    private const int MaxMemories = 20;

    private static readonly Dictionary<string, (int Min, int Max, int Size)> LottoGameRanges = new()
    {
        ["6/42"] = (1, 42, 6),
        ["6/45"] = (1, 45, 6),
        ["6/49"] = (1, 49, 6),
        ["6/55"] = (1, 55, 6),
        ["6/58"] = (1, 58, 6),
    };

    private static readonly JsonSerializerOptions CamelCaseJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task RunAsync()
    {
        var schedule = await scheduleRepo.GetAsync();
        if (schedule is null || !schedule.IsEnabled) return;

        ScheduledGameSettings? settings;
        try
        {
            settings = JsonSerializer.Deserialize<ScheduledGameSettings>(
                schedule.GameSettingsJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch
        {
            return;
        }

        if (settings is null) return;

        // Resolve number range from lotto game code if not already set
        if (!LottoGameRanges.TryGetValue(settings.LottoGame, out var range))
            range = (1, 42, 6);

        settings = settings with
        {
            CombinationSize = settings.CombinationSize > 0 ? settings.CombinationSize : range.Size,
            NumberRangeMin = settings.NumberRangeMin > 0 ? settings.NumberRangeMin : range.Min,
            NumberRangeMax = settings.NumberRangeMax > 0 ? settings.NumberRangeMax : range.Max,
        };

        // Fetch historical draws for secret combination pool
        var game = await gameRepo.GetByCodeAsync(settings.LottoGame);
        int[][] historicalDraws = [];
        if (game is not null)
        {
            var draws = await drawRepo.GetLatestAsync(game.Id, 500);
            historicalDraws = draws.Select(d => d.GetNumbers().Select(n => (int)n).ToArray()).ToArray();
        }

        // Build veteran seed pool when UseVeterans is enabled.
        // Mirrors buildVeteranPool() in useGameEngine.ts — reuses existing
        // career names + confidence maps so scheduled runs update existing
        // veterans instead of generating new ones every tick.
        List<VeteranSeed>? veteranSeeds = null;
        if (settings.UseVeterans)
        {
            var allCareers = await careerRepo.GetAllAsync();
            veteranSeeds = allCareers
                .Select(c =>
                {
                    var stats = c.LottoStats.FirstOrDefault(s => s.LottoGameCode == settings.LottoGame);
                    var map = stats is not null ? ParseConfidenceMap(stats.ConfidenceMapJson) : [];
                    return new VeteranSeed(c.Name, c.Personality, map);
                })
                .ToList();
        }

        // Run simulation
        var result = simulator.RunSimulation(settings, historicalDraws, veteranSeeds);

        // Get admin user to associate with the session
        var (users, _) = await userRepo.GetPagedAsync(1, 100);
        var adminUser = users.FirstOrDefault(u => u.Role == UserRole.Admin);
        if (adminUser is null) return;

        var session = new TrainingSession
        {
            Id = Guid.NewGuid(),
            UserId = adminUser.Id,
            GameMode = "scheduled",
            LottoGameCode = settings.LottoGame,
            Result = result.Result,
            DurationSeconds = result.DurationSeconds,
            TotalRounds = result.TotalRounds,
            TotalExperts = result.TotalExperts,
            SurvivingExperts = result.SurvivingExperts,
            SettingsJson = result.SettingsJson,
            WinnerJson = result.WinnerJson,
            WinnerProfileJson = null,
            LeaderboardJson = result.LeaderboardJson,
            PlayedAt = DateTime.UtcNow,
        };

        await sessionRepo.AddAsync(session);

        await UpdateExpertCareersAsync(adminUser.Id, settings.LottoGame, result.ExpertOutcomes);
    }

    private async Task UpdateExpertCareersAsync(Guid userId, string lottoGame, List<ExpertOutcome> outcomes)
    {
        var now = DateTime.UtcNow;
        var gameId = Guid.NewGuid().ToString();

        foreach (var outcome in outcomes)
        {
            var career = await careerRepo.GetByUserNamePersonalityAsync(userId, outcome.Name, outcome.Personality);

            if (career is null)
            {
                career = new ExpertCareer
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Name = outcome.Name,
                    Personality = outcome.Personality,
                    GamesPlayed = 0,
                    Wins = 0,
                    Eliminations = 0,
                    TotalRoundsPlayed = 0,
                    BestEverScore = 0,
                    AvgRoundScore = 0m,
                    LastPlayedAt = null,
                    CreatedAt = now,
                    UpdatedAt = now,
                };
            }

            var prevTotalRounds = career.TotalRoundsPlayed;
            career.GamesPlayed += 1;
            if (outcome.Status == "winner") career.Wins += 1;
            if (outcome.Status == "eliminated") career.Eliminations += 1;
            career.TotalRoundsPlayed += outcome.RoundsPlayed;
            career.LastPlayedAt = now;

            if (outcome.BestEverStars > career.BestEverScore)
                career.BestEverScore = outcome.BestEverStars;

            if (outcome.RoundsPlayed > 0)
            {
                var newTotal = career.TotalRoundsPlayed;
                career.AvgRoundScore = newTotal > 0
                    ? ((career.AvgRoundScore * prevTotalRounds) + ((decimal)outcome.AvgRoundScore * outcome.RoundsPlayed)) / newTotal
                    : (decimal)outcome.AvgRoundScore;
            }

            await careerRepo.UpsertAsync(career);

            // Re-fetch to get the persisted ID (in case it was newly created)
            var saved = await careerRepo.GetByUserNamePersonalityAsync(userId, outcome.Name, outcome.Personality);
            if (saved is null) continue;

            var existingStats = saved.LottoStats.FirstOrDefault(s => s.LottoGameCode == lottoGame);
            var stats = existingStats ?? new ExpertLottoStats
            {
                Id = Guid.NewGuid(),
                ExpertCareerId = saved.Id,
                LottoGameCode = lottoGame,
                GamesPlayed = 0,
                Wins = 0,
                Eliminations = 0,
                ConfidenceMapJson = "{}",
                GameMemoriesJson = "[]",
                CareerSummaryJson = null,
                UpdatedAt = now,
            };

            stats.GamesPlayed += 1;
            if (outcome.Status == "winner") stats.Wins += 1;
            if (outcome.Status == "eliminated") stats.Eliminations += 1;

            var cumulativeMap = ParseConfidenceMap(stats.ConfidenceMapJson);
            var mergedMap = MergeConfidenceMaps(cumulativeMap, outcome.ConfidenceMap);
            stats.ConfidenceMapJson = JsonSerializer.Serialize(
                mergedMap.ToDictionary(kv => kv.Key.ToString(), kv => kv.Value));

            var memories = ParseMemories(stats.GameMemoriesJson);
            memories.Add(BuildMemory(outcome, gameId, now));
            if (memories.Count > MaxMemories)
                memories = memories.Skip(memories.Count - MaxMemories).ToList();
            stats.GameMemoriesJson = JsonSerializer.Serialize(memories, CamelCaseJson);

            stats.UpdatedAt = now;
            await careerRepo.UpsertStatsAsync(stats);
        }
    }

    private static Dictionary<int, double> ParseConfidenceMap(string json)
    {
        try
        {
            var parsed = JsonSerializer.Deserialize<Dictionary<string, double>>(json) ?? [];
            var result = new Dictionary<int, double>();
            foreach (var (k, v) in parsed)
                if (int.TryParse(k, out var key)) result[key] = v;
            return result;
        }
        catch
        {
            return [];
        }
    }

    private static Dictionary<int, double> MergeConfidenceMaps(
        Dictionary<int, double> cumulative,
        Dictionary<int, double> game)
    {
        var merged = new Dictionary<int, double>();
        var keys = new HashSet<int>(cumulative.Keys);
        foreach (var k in game.Keys) keys.Add(k);
        foreach (var k in keys)
        {
            cumulative.TryGetValue(k, out var oldVal);
            game.TryGetValue(k, out var newVal);
            merged[k] = oldVal * DecayFactor + newVal * LearningRate;
        }
        return merged;
    }

    private static List<GameMemoryDto> ParseMemories(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<GameMemoryDto>>(json, CamelCaseJson) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static GameMemoryDto BuildMemory(ExpertOutcome outcome, string gameId, DateTime now)
    {
        var secretSet = new HashSet<int>(outcome.SecretCombo);
        var matched = outcome.BestGuess.Where(secretSet.Contains).ToArray();

        var top = outcome.ConfidenceMap
            .OrderByDescending(kv => kv.Value)
            .Take(5)
            .Select(kv => kv.Key)
            .ToArray();
        var bottom = outcome.ConfidenceMap
            .OrderBy(kv => kv.Value)
            .Take(5)
            .Select(kv => kv.Key)
            .ToArray();

        var lesson = matched.Length > 0
            ? $"Matched {string.Join(", ", matched)} in best try ({outcome.BestEverStars}★). Top confidence: {string.Join(", ", top.Take(3))}."
            : $"No matches in best try. Top confidence numbers {string.Join(", ", top.Take(3))} need re-evaluation.";

        var resultStr = outcome.Status switch
        {
            "winner" => "won",
            "eliminated" => $"eliminated_round_{outcome.EliminatedAtRound ?? 0}",
            _ => "survived_time_up"
        };

        return new GameMemoryDto
        {
            GameId = gameId,
            PlayedAt = now.ToString("o"),
            Result = resultStr,
            RoundsPlayed = outcome.RoundsPlayed,
            BestScore = outcome.BestEverStars,
            BestGuess = outcome.BestGuess,
            SecretCombo = outcome.SecretCombo,
            MatchedNumbers = matched,
            TopConfidence = top,
            BottomConfidence = bottom,
            Lesson = lesson,
            Mode = "scheduled",
        };
    }

    private class GameMemoryDto
    {
        public string GameId { get; set; } = string.Empty;
        public string PlayedAt { get; set; } = string.Empty;
        public string Result { get; set; } = string.Empty;
        public int RoundsPlayed { get; set; }
        public int BestScore { get; set; }
        public int[] BestGuess { get; set; } = [];
        public int[] SecretCombo { get; set; } = [];
        public int[] MatchedNumbers { get; set; } = [];
        public int[] TopConfidence { get; set; } = [];
        public int[] BottomConfidence { get; set; } = [];
        public string Lesson { get; set; } = string.Empty;
        public string Mode { get; set; } = string.Empty;
    }
}
