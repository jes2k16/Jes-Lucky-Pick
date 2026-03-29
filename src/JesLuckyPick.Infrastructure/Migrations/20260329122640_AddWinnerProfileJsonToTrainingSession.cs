using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JesLuckyPick.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWinnerProfileJsonToTrainingSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WinnerProfileJson",
                table: "training_sessions",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WinnerProfileJson",
                table: "training_sessions");
        }
    }
}
