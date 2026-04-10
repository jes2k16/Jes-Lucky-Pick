using JesLuckyPick.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JesLuckyPick.Infrastructure.Persistence.Configurations;

public class TrainingScheduleConfiguration : IEntityTypeConfiguration<TrainingSchedule>
{
    public void Configure(EntityTypeBuilder<TrainingSchedule> builder)
    {
        builder.ToTable("training_schedules");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.FrequencyType).HasMaxLength(10);
        builder.Property(x => x.TimeSlotsJson).HasColumnType("jsonb");
        builder.Property(x => x.GameSettingsJson).HasColumnType("jsonb");
        builder.Property(x => x.CreatedAtUtc).HasDefaultValueSql("now()");
    }
}
