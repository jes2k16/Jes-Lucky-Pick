using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JesLuckyPick.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTrainingEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "expert_careers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Personality = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    GamesPlayed = table.Column<int>(type: "integer", nullable: false),
                    Wins = table.Column<int>(type: "integer", nullable: false),
                    Eliminations = table.Column<int>(type: "integer", nullable: false),
                    TotalRoundsPlayed = table.Column<int>(type: "integer", nullable: false),
                    BestEverScore = table.Column<int>(type: "integer", nullable: false),
                    AvgRoundScore = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    LastPlayedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_careers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_expert_careers_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "training_sessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    GameMode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    LottoGameCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Result = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: false),
                    TotalRounds = table.Column<int>(type: "integer", nullable: false),
                    TotalExperts = table.Column<int>(type: "integer", nullable: false),
                    SurvivingExperts = table.Column<int>(type: "integer", nullable: false),
                    SettingsJson = table.Column<string>(type: "jsonb", nullable: false),
                    WinnerJson = table.Column<string>(type: "jsonb", nullable: true),
                    LeaderboardJson = table.Column<string>(type: "jsonb", nullable: true),
                    PlayedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_training_sessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_training_sessions_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "expert_lotto_stats",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpertCareerId = table.Column<Guid>(type: "uuid", nullable: false),
                    LottoGameCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    GamesPlayed = table.Column<int>(type: "integer", nullable: false),
                    Wins = table.Column<int>(type: "integer", nullable: false),
                    Eliminations = table.Column<int>(type: "integer", nullable: false),
                    ConfidenceMapJson = table.Column<string>(type: "jsonb", nullable: false),
                    GameMemoriesJson = table.Column<string>(type: "jsonb", nullable: false),
                    CareerSummaryJson = table.Column<string>(type: "jsonb", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expert_lotto_stats", x => x.Id);
                    table.ForeignKey(
                        name: "FK_expert_lotto_stats_expert_careers_ExpertCareerId",
                        column: x => x.ExpertCareerId,
                        principalTable: "expert_careers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_expert_careers_UserId_Name_Personality",
                table: "expert_careers",
                columns: new[] { "UserId", "Name", "Personality" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_expert_lotto_stats_ExpertCareerId_LottoGameCode",
                table: "expert_lotto_stats",
                columns: new[] { "ExpertCareerId", "LottoGameCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_training_sessions_UserId_PlayedAt",
                table: "training_sessions",
                columns: new[] { "UserId", "PlayedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "expert_lotto_stats");

            migrationBuilder.DropTable(
                name: "training_sessions");

            migrationBuilder.DropTable(
                name: "expert_careers");
        }
    }
}
