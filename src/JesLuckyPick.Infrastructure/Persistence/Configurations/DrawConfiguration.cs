using JesLuckyPick.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JesLuckyPick.Infrastructure.Persistence.Configurations;

public class DrawConfiguration : IEntityTypeConfiguration<Draw>
{
    public void Configure(EntityTypeBuilder<Draw> builder)
    {
        builder.ToTable("draws");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.JackpotAmount).HasPrecision(18, 2);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        builder.HasIndex(x => new { x.GameId, x.DrawDate }).IsUnique();
        builder.HasIndex(x => x.DrawDate);

        builder.HasOne(x => x.Game)
            .WithMany(g => g.Draws)
            .HasForeignKey(x => x.GameId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
