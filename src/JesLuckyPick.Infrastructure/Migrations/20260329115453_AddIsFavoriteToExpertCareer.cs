using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JesLuckyPick.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIsFavoriteToExpertCareer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsFavorite",
                table: "expert_careers",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsFavorite",
                table: "expert_careers");
        }
    }
}
