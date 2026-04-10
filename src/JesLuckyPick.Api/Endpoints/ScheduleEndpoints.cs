using System.Text.Json;
using Hangfire;
using JesLuckyPick.Domain.Entities;
using JesLuckyPick.Domain.Interfaces;
using JesLuckyPick.Infrastructure.Training;
using Microsoft.AspNetCore.Mvc;

namespace JesLuckyPick.Api.Endpoints;

public static class ScheduleEndpoints
{
    public static IEndpointRouteBuilder MapScheduleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/schedule").RequireAuthorization("AdminOnly");

        group.MapGet("/", GetSchedule);
        group.MapPut("/", SaveSchedule);
        group.MapPost("/trigger", TriggerNow);
        group.MapGet("/history", GetHistory);

        return app;
    }

    private static async Task<IResult> GetHistory(
        ITrainingSessionRepository sessionRepo,
        int page = 1,
        int pageSize = 50)
    {
        // Global (not per-user) — the training schedule is a singleton resource, and
        // scheduled sessions can be created by the Hangfire cron (admin) or any user
        // via "Trigger Now", so history must span all users to be complete.
        var (items, totalCount) = await sessionRepo.GetAllPagedAsync(
            page, pageSize, gameMode: "scheduled");

        return Results.Ok(new
        {
            items = items.Select(s => new
            {
                s.Id,
                s.PlayedAt,
                s.Result,
                s.WinnerJson,
                s.TotalRounds,
                s.DurationSeconds,
                s.TotalExperts,
                s.SurvivingExperts,
            }),
            totalCount,
            page,
            pageSize,
        });
    }

    private static async Task<IResult> GetSchedule(
        ITrainingScheduleRepository repo)
    {
        var schedule = await repo.GetAsync();
        if (schedule is null) return Results.NoContent();

        return Results.Ok(ToResponse(schedule));
    }

    private static async Task<IResult> SaveSchedule(
        [FromBody] SaveScheduleRequest request,
        ITrainingScheduleRepository repo,
        TrainingSchedulerService scheduler)
    {
        var schedule = new TrainingSchedule
        {
            IsEnabled = request.IsEnabled,
            FrequencyType = request.FrequencyType,
            DaysOfWeekMask = request.DaysOfWeekMask,
            TimeSlotsJson = JsonSerializer.Serialize(request.TimeSlots),
            GameSettingsJson = request.GameSettingsJson,
        };

        var saved = await repo.UpsertAsync(schedule);
        scheduler.Apply(saved);

        return Results.Ok(ToResponse(saved));
    }

    private static IResult TriggerNow()
    {
        BackgroundJob.Enqueue<ScheduledTrainingJob>(j => j.RunAsync());
        return Results.Ok(new { message = "Training job enqueued." });
    }

    private static ScheduleResponse ToResponse(TrainingSchedule s)
    {
        string[] slots;
        try { slots = JsonSerializer.Deserialize<string[]>(s.TimeSlotsJson) ?? []; }
        catch { slots = []; }

        return new ScheduleResponse(
            s.Id, s.IsEnabled, s.FrequencyType,
            s.DaysOfWeekMask, slots,
            s.GameSettingsJson, s.UpdatedAtUtc);
    }
}

public record SaveScheduleRequest(
    bool IsEnabled,
    string FrequencyType,
    int DaysOfWeekMask,
    string[] TimeSlots,
    string GameSettingsJson);

public record ScheduleResponse(
    Guid Id,
    bool IsEnabled,
    string FrequencyType,
    int DaysOfWeekMask,
    string[] TimeSlots,
    string GameSettingsJson,
    DateTime UpdatedAtUtc);
