using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JesLuckyPick.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTrainingSchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "training_schedules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    FrequencyType = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    DaysOfWeekMask = table.Column<int>(type: "integer", nullable: false),
                    TimeSlotsJson = table.Column<string>(type: "jsonb", nullable: false),
                    GameSettingsJson = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_training_schedules", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "training_schedules");
        }
    }
}
