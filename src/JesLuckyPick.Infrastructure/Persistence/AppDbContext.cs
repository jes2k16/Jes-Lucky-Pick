using JesLuckyPick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace JesLuckyPick.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<LottoGame> LottoGames => Set<LottoGame>();
    public DbSet<Draw> Draws => Set<Draw>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Prediction> Predictions => Set<Prediction>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    public DbSet<AgentPrompt> AgentPrompts => Set<AgentPrompt>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
