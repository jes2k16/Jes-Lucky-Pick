using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JesLuckyPick.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ChangeDrawDateToDateTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "DrawDate",
                table: "draws",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            // Backfill existing rows: set time to 13:00 UTC (9 PM PHT)
            migrationBuilder.Sql(
                """UPDATE draws SET "DrawDate" = "DrawDate" + INTERVAL '13 hours'""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateOnly>(
                name: "DrawDate",
                table: "draws",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");
        }
    }
}
