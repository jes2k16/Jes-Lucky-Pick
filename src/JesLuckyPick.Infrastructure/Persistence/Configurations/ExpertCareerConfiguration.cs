using JesLuckyPick.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JesLuckyPick.Infrastructure.Persistence.Configurations;

public class ExpertCareerConfiguration : IEntityTypeConfiguration<ExpertCareer>
{
    public void Configure(EntityTypeBuilder<ExpertCareer> builder)
    {
        builder.ToTable("expert_careers");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(50);
        builder.Property(x => x.Personality).HasMaxLength(20);
        builder.Property(x => x.AvgRoundScore).HasPrecision(8, 4);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
        builder.Property(x => x.UpdatedAt).HasDefaultValueSql("now()");

        builder.HasOne(x => x.User)
            .WithMany(u => u.ExpertCareers)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.LottoStats)
            .WithOne(s => s.ExpertCareer)
            .HasForeignKey(s => s.ExpertCareerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.UserId, x.Name, x.Personality }).IsUnique();
    }
}
