using JesLuckyPick.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JesLuckyPick.Infrastructure.Persistence.Configurations;

public class LottoGameConfiguration : IEntityTypeConfiguration<LottoGame>
{
    public void Configure(EntityTypeBuilder<LottoGame> builder)
    {
        builder.ToTable("lotto_games");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(10).IsRequired();
        builder.Property(x => x.DrawDays).HasMaxLength(20).IsRequired();
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        builder.HasIndex(x => x.Code).IsUnique();
    }
}
