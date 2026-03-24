using System.Globalization;
using JesLuckyPick.Application.Common.Interfaces;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JesLuckyPick.Infrastructure.Persistence.Seeding;

public class DatabaseSeeder(
    AppDbContext context,
    IPasswordHasher passwordHasher,
    ILogger<DatabaseSeeder> logger)
{
    private static readonly Guid Lotto642Id = Guid.Parse("a1b2c3d4-0001-0001-0001-000000000001");

    public async Task SeedAsync(CancellationToken ct = default)
    {
        await SeedLottoGamesAsync(ct);
        await SeedDrawsFromCsvAsync(ct);
        await SeedDefaultAdminAsync(ct);
        await SeedDefaultSettingsAsync(ct);
    }

    private async Task SeedDefaultAdminAsync(CancellationToken ct)
    {
        if (await context.Users.AnyAsync(u => u.Role == UserRole.Admin, ct))
            return;

        var (hash, salt) = passwordHasher.HashPassword("Admin@123");

        var admin = new User
        {
            Id = Guid.NewGuid(),
            Username = "admin",
            Email = "admin@jesluckypick.com",
            PasswordHash = hash,
            PasswordSalt = salt,
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await context.Users.AddAsync(admin, ct);
        await context.SaveChangesAsync(ct);
        logger.LogInformation("Seeded default admin user (username: admin, password: Admin@123)");
    }

    private async Task SeedLottoGamesAsync(CancellationToken ct)
    {
        if (await context.LottoGames.AnyAsync(ct))
            return;

        var games = new List<LottoGame>
        {
            new()
            {
                Id = Lotto642Id, Name = "Lotto 6/42", Code = "6_42",
                MaxNumber = 42, PickCount = 6, DrawsPerWeek = 3,
                DrawDays = "Tue,Thu,Sat", IsActive = true, CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.Parse("a1b2c3d4-0001-0001-0001-000000000002"),
                Name = "Super Lotto 6/49", Code = "6_49",
                MaxNumber = 49, PickCount = 6, DrawsPerWeek = 3,
                DrawDays = "Tue,Thu,Sun", IsActive = false, CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.Parse("a1b2c3d4-0001-0001-0001-000000000003"),
                Name = "Grand Lotto 6/55", Code = "6_55",
                MaxNumber = 55, PickCount = 6, DrawsPerWeek = 3,
                DrawDays = "Mon,Wed,Sat", IsActive = false, CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.Parse("a1b2c3d4-0001-0001-0001-000000000004"),
                Name = "Ultra Lotto 6/58", Code = "6_58",
                MaxNumber = 58, PickCount = 6, DrawsPerWeek = 3,
                DrawDays = "Tue,Fri,Sun", IsActive = false, CreatedAt = DateTime.UtcNow
            }
        };

        await context.LottoGames.AddRangeAsync(games, ct);
        await context.SaveChangesAsync(ct);
        logger.LogInformation("Seeded {Count} lotto games", games.Count);
    }

    private async Task SeedDrawsFromCsvAsync(CancellationToken ct)
    {
        if (await context.Draws.AnyAsync(ct))
            return;

        var csvPath = Path.Combine(
            AppContext.BaseDirectory, "SeedData", "pcso_642_draws.csv");

        if (!File.Exists(csvPath))
        {
            logger.LogWarning("Seed data file not found at {Path}. Skipping draw seeding.", csvPath);
            return;
        }

        var draws = new List<Draw>();
        var lines = await File.ReadAllLinesAsync(csvPath, ct);

        foreach (var line in lines.Skip(1)) // skip header
        {
            if (string.IsNullOrWhiteSpace(line)) continue;

            var parts = line.Split(',');
            if (parts.Length < 7) continue;

            if (!DateTime.TryParse(parts[0].Trim(), CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var parsedDrawDate))
                continue;
            var drawDate = DateTime.SpecifyKind(parsedDrawDate.Date.AddHours(13), DateTimeKind.Utc);

            var numbers = new short[6];
            var valid = true;
            for (var i = 0; i < 6; i++)
            {
                if (short.TryParse(parts[i + 1].Trim(), out var num))
                    numbers[i] = num;
                else
                    valid = false;
            }
            if (!valid) continue;

            Array.Sort(numbers);

            decimal? jackpot = null;
            if (parts.Length > 7 && decimal.TryParse(parts[7].Trim(), NumberStyles.Any,
                    CultureInfo.InvariantCulture, out var jp))
                jackpot = jp;

            int? winners = null;
            if (parts.Length > 8 && int.TryParse(parts[8].Trim(), out var w))
                winners = w;

            draws.Add(new Draw
            {
                Id = Guid.NewGuid(),
                GameId = Lotto642Id,
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

        // Bulk insert in batches
        const int batchSize = 500;
        for (var i = 0; i < draws.Count; i += batchSize)
        {
            var batch = draws.Skip(i).Take(batchSize);
            await context.Draws.AddRangeAsync(batch, ct);
            await context.SaveChangesAsync(ct);
        }

        logger.LogInformation("Seeded {Count} draws from CSV", draws.Count);
    }

    private async Task SeedDefaultSettingsAsync(CancellationToken ct)
    {
        if (await context.AppSettings.AnyAsync(ct))
            return;

        var defaults = new List<AppSetting>
        {
            new() { Key = "Ai:IsEnabled", Value = "false", UpdatedAt = DateTime.UtcNow },
            new() { Key = "Ai:Model", Value = "claude-sonnet-4-20250514", UpdatedAt = DateTime.UtcNow }
        };

        await context.AppSettings.AddRangeAsync(defaults, ct);
        await context.SaveChangesAsync(ct);
        logger.LogInformation("Seeded default AI settings");
    }
}
