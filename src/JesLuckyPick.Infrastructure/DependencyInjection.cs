using JesLuckyPick.Application.Common.Interfaces;
using JesLuckyPick.Domain.Interfaces;
using JesLuckyPick.Infrastructure.AI.Services;
using JesLuckyPick.Infrastructure.Identity;
using JesLuckyPick.Infrastructure.Persistence;
using JesLuckyPick.Infrastructure.Persistence.Repositories;
using JesLuckyPick.Infrastructure.Persistence.Seeding;
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

        services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddScoped<DatabaseSeeder>();
        services.AddScoped<PredictionOrchestratorService>();

        return services;
    }
}
