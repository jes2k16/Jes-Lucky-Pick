using JesLuckyPick.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JesLuckyPick.Infrastructure.Persistence.Configurations;

public class TrainingSessionConfiguration : IEntityTypeConfiguration<TrainingSession>
{
    public void Configure(EntityTypeBuilder<TrainingSession> builder)
    {
        builder.ToTable("training_sessions");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.GameMode).HasMaxLength(20);
        builder.Property(x => x.LottoGameCode).HasMaxLength(10);
        builder.Property(x => x.Result).HasMaxLength(30);
        builder.Property(x => x.SettingsJson).HasColumnType("jsonb");
        builder.Property(x => x.WinnerJson).HasColumnType("jsonb");
        builder.Property(x => x.LeaderboardJson).HasColumnType("jsonb");
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        builder.HasOne(x => x.User)
            .WithMany(u => u.TrainingSessions)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.UserId, x.PlayedAt });
    }
}
