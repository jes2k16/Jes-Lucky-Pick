using JesLuckyPick.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JesLuckyPick.Infrastructure.Persistence.Configurations;

public class AgentPromptConfiguration : IEntityTypeConfiguration<AgentPrompt>
{
    public void Configure(EntityTypeBuilder<AgentPrompt> builder)
    {
        builder.ToTable("agent_prompts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Role).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Personality).HasMaxLength(50);
        builder.Property(x => x.SystemPrompt).IsRequired();
        builder.Property(x => x.Model).HasMaxLength(100).IsRequired();
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
        builder.Property(x => x.UpdatedAt).HasDefaultValueSql("now()");

        builder.HasIndex(x => new { x.Role, x.Personality }).IsUnique();
    }
}
