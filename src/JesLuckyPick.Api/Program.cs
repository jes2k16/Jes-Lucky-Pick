using System.Text;
using Hangfire;
using JesLuckyPick.Api.Endpoints;
using JesLuckyPick.Api.Hubs;
using JesLuckyPick.Api.Middleware;
using JesLuckyPick.Domain.Interfaces;
using JesLuckyPick.Infrastructure;
using JesLuckyPick.Infrastructure.Persistence;
using JesLuckyPick.Infrastructure.Persistence.Seeding;
using JesLuckyPick.Infrastructure.Training;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) &&
                    context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddSignalR(options =>
{
    // Allow concurrent hub invocations per client so parallel concurrency modes work.
    // Default is 1 (sequential queue), which prevents fully-parallel / parallel-per-manager.
    options.MaximumParallelInvocationsPerClient = 50;
});
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
    await seeder.SeedAsync();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseStaticFiles();

app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = [new HangfireAdminAuthFilter()],
    DarkModeEnabled = true,
});

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapDrawEndpoints();
app.MapAnalysisEndpoints();
app.MapDashboardEndpoints();
app.MapPredictionEndpoints();
app.MapProfileEndpoints();
app.MapSettingsEndpoints();
app.MapHub<TerminalHub>("/hubs/terminal");
app.MapHub<GameHub>("/hubs/game");
app.MapAgentPromptEndpoints();
app.MapTrainingEndpoints();
app.MapScheduleEndpoints();
app.MapFallbackToFile("index.html");

// Reload saved schedule into Hangfire on startup (survives app restarts)
using (var startupScope = app.Services.CreateScope())
{
    var scheduleRepo = startupScope.ServiceProvider.GetRequiredService<ITrainingScheduleRepository>();
    var scheduler = startupScope.ServiceProvider.GetRequiredService<TrainingSchedulerService>();
    var existingSchedule = await scheduleRepo.GetAsync();
    if (existingSchedule is not null)
        scheduler.Apply(existingSchedule);
}

app.Run();
