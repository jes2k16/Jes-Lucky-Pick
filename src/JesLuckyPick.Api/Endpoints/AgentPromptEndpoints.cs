using System.Diagnostics;
using JesLuckyPick.Application.Features.AgentPrompts.DTOs;
using JesLuckyPick.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace JesLuckyPick.Api.Endpoints;

public static class AgentPromptEndpoints
{
    public static void MapAgentPromptEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/agent-prompts")
            .RequireAuthorization(policy => policy.RequireRole("Admin"));

        group.MapGet("/", GetAll);
        group.MapGet("/{id:guid}", GetById);
        group.MapPut("/{id:guid}", Update);
        group.MapPost("/", Create);
        group.MapPost("/test", TestPrompt);
    }

    private static async Task<IResult> GetAll(AppDbContext db, CancellationToken ct)
    {
        var prompts = await db.AgentPrompts
            .OrderBy(p => p.Role)
            .ThenBy(p => p.Personality)
            .Select(p => new AgentPromptResponse(
                p.Id, p.Role, p.Personality, p.SystemPrompt,
                p.Model, p.IsActive, p.CreatedAt, p.UpdatedAt))
            .ToListAsync(ct);

        return Results.Ok(prompts);
    }

    private static async Task<IResult> GetById(Guid id, AppDbContext db, CancellationToken ct)
    {
        var prompt = await db.AgentPrompts.FindAsync([id], ct);
        if (prompt == null) return Results.NotFound();

        return Results.Ok(new AgentPromptResponse(
            prompt.Id, prompt.Role, prompt.Personality, prompt.SystemPrompt,
            prompt.Model, prompt.IsActive, prompt.CreatedAt, prompt.UpdatedAt));
    }

    private static async Task<IResult> Update(
        Guid id, UpdateAgentPromptRequest request, AppDbContext db, CancellationToken ct)
    {
        var prompt = await db.AgentPrompts.FindAsync([id], ct);
        if (prompt == null) return Results.NotFound();

        prompt.SystemPrompt = request.SystemPrompt;
        prompt.Model = request.Model;
        prompt.IsActive = request.IsActive;
        prompt.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return Results.Ok(new AgentPromptResponse(
            prompt.Id, prompt.Role, prompt.Personality, prompt.SystemPrompt,
            prompt.Model, prompt.IsActive, prompt.CreatedAt, prompt.UpdatedAt));
    }

    private static async Task<IResult> Create(
        CreateAgentPromptRequest request, AppDbContext db, CancellationToken ct)
    {
        var exists = await db.AgentPrompts.AnyAsync(
            p => p.Role == request.Role && p.Personality == request.Personality, ct);

        if (exists)
            return Results.Conflict(new { message = $"Prompt for {request.Role}/{request.Personality ?? "default"} already exists." });

        var prompt = new JesLuckyPick.Domain.Entities.AgentPrompt
        {
            Id = Guid.NewGuid(),
            Role = request.Role,
            Personality = request.Personality,
            SystemPrompt = request.SystemPrompt,
            Model = request.Model,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.AgentPrompts.Add(prompt);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/agent-prompts/{prompt.Id}", new AgentPromptResponse(
            prompt.Id, prompt.Role, prompt.Personality, prompt.SystemPrompt,
            prompt.Model, prompt.IsActive, prompt.CreatedAt, prompt.UpdatedAt));
    }

    private static string ResolveClaudePath()
    {
        if (OperatingSystem.IsWindows())
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var cmdPath = Path.Combine(appData, "npm", "claude.cmd");
            if (File.Exists(cmdPath)) return cmdPath;
        }
        return "claude";
    }

    private static async Task<IResult> TestPrompt(
        TestAgentPromptRequest request, CancellationToken ct)
    {
        try
        {
            using var process = new Process();
            process.StartInfo = new ProcessStartInfo
            {
                FileName = ResolveClaudePath(),
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            process.StartInfo.ArgumentList.Add("-p");
            process.StartInfo.ArgumentList.Add(request.Prompt);
            process.StartInfo.ArgumentList.Add("--model");
            process.StartInfo.ArgumentList.Add(request.Model);

            process.Start();

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(30));

            var output = await process.StandardOutput.ReadToEndAsync(timeoutCts.Token);
            var error = await process.StandardError.ReadToEndAsync(timeoutCts.Token);
            await process.WaitForExitAsync(timeoutCts.Token);

            if (process.ExitCode != 0)
                return Results.Ok(new TestAgentPromptResponse(false, null, error));

            return Results.Ok(new TestAgentPromptResponse(true, output.Trim(), null));
        }
        catch (Exception ex)
        {
            return Results.Ok(new TestAgentPromptResponse(false, null, ex.Message));
        }
    }
}
