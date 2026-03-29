using JesLuckyPick.Application.Common.Interfaces;
using JesLuckyPick.Domain.Interfaces;
using JesLuckyPick.Infrastructure.AI.Services;
using JesLuckyPick.Infrastructure.External;
using JesLuckyPick.Infrastructure.Identity;
using JesLuckyPick.Infrastructure.Persistence;
using JesLuckyPick.Infrastructure.Persistence.Repositories;
using JesLuckyPick.Infrastructure.Persistence.Seeding;
using JesLuckyPick.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace JesLuckyPick.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IDrawRepository, DrawRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IPredictionRepository, PredictionRepository>();
        services.AddScoped<ILottoGameRepository, LottoGameRepository>();
        services.AddScoped<IAppSettingRepository, AppSettingRepository>();
        services.AddScoped<ITrainingSessionRepository, TrainingSessionRepository>();
        services.AddScoped<IExpertCareerRepository, ExpertCareerRepository>();

        services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton<IEncryptionService, AesEncryptionService>();
        services.AddScoped<IAiPredictionService, ClaudeAiPredictionService>();
        services.AddScoped<DatabaseSeeder>();
        services.AddScoped<PredictionOrchestratorService>();
        services.AddHttpClient<IDrawFetchService, PcsoDrawFetchService>();

        return services;
    }
}
