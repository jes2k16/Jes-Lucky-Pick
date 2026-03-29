using JesLuckyPick.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JesLuckyPick.Infrastructure.Persistence.Configurations;

public class ExpertLottoStatsConfiguration : IEntityTypeConfiguration<ExpertLottoStats>
{
    public void Configure(EntityTypeBuilder<ExpertLottoStats> builder)
    {
        builder.ToTable("expert_lotto_stats");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.LottoGameCode).HasMaxLength(10);
        builder.Property(x => x.ConfidenceMapJson).HasColumnType("jsonb");
        builder.Property(x => x.GameMemoriesJson).HasColumnType("jsonb");
        builder.Property(x => x.CareerSummaryJson).HasColumnType("jsonb");
        builder.Property(x => x.UpdatedAt).HasDefaultValueSql("now()");

        builder.HasIndex(x => new { x.ExpertCareerId, x.LottoGameCode }).IsUnique();
    }
}
