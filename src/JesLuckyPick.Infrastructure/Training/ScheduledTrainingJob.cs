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
    GameSimulatorService simulator)
{
    private static readonly Dictionary<string, (int Min, int Max, int Size)> LottoGameRanges = new()
    {
        ["6/42"] = (1, 42, 6),
        ["6/45"] = (1, 45, 6),
        ["6/49"] = (1, 49, 6),
        ["6/55"] = (1, 55, 6),
        ["6/58"] = (1, 58, 6),
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

        // Run simulation
        var result = simulator.RunSimulation(settings, historicalDraws);

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
    }
}
