# Training Schedule Feature

## Context

The user wants to configure recurring automated training game runs — e.g. "every day at 12:00 UTC" or "every Monday + Friday at 09:00 UTC". When the schedule fires, it should silently run a simulation game on the server and save the result as a `TrainingSession`. No user interaction needed after configuration.

**Scheduler recommendation: Hangfire** with PostgreSQL storage (`Hangfire.PostgreSql`). It integrates cleanly with ASP.NET Core DI, stores jobs in the existing PostgreSQL DB, survives app restarts, and supports cron expressions. Alternative (Quartz.NET) is more enterprise but heavier; Hangfire is the right fit here.

---

## Architecture Overview

```
Frontend (new page /training-schedule)
  → PUT /api/schedule
  → Backend saves TrainingSchedule entity
  → Hangfire recurring jobs are (re)registered
  → Job fires → GameSimulatorService runs → TrainingSession saved to DB
```

---

## Files to Create / Modify

### Backend

| Action | File |
|--------|------|
| **Create** | `src/JesLuckyPick.Domain/Entities/TrainingSchedule.cs` |
| **Create** | `src/JesLuckyPick.Domain/Interfaces/ITrainingScheduleRepository.cs` |
| **Create** | `src/JesLuckyPick.Infrastructure/Persistence/Configurations/TrainingScheduleConfiguration.cs` |
| **Create** | `src/JesLuckyPick.Infrastructure/Persistence/Repositories/TrainingScheduleRepository.cs` |
| **Create** | `src/JesLuckyPick.Infrastructure/Training/GameSimulatorService.cs` |
| **Create** | `src/JesLuckyPick.Infrastructure/Training/ScheduledTrainingJob.cs` |
| **Create** | `src/JesLuckyPick.Infrastructure/Training/TrainingSchedulerService.cs` |
| **Create** | `src/JesLuckyPick.Api/Endpoints/ScheduleEndpoints.cs` |
| **Modify** | `src/JesLuckyPick.Infrastructure/Persistence/AppDbContext.cs` |
| **Modify** | `src/JesLuckyPick.Infrastructure/DependencyInjection.cs` |
| **Modify** | `src/JesLuckyPick.Api/Program.cs` |
| **Modify** | `src/JesLuckyPick.Infrastructure/JesLuckyPick.Infrastructure.csproj` |
| **Modify** | `src/JesLuckyPick.Api/JesLuckyPick.Api.csproj` |
| **New migration** | `dotnet ef migrations add AddTrainingSchedule` |

### Frontend

| Action | File |
|--------|------|
| **Create** | `src/jes-lucky-pick-client/src/features/schedule/pages/TrainingSchedulePage.tsx` |
| **Create** | `src/jes-lucky-pick-client/src/features/schedule/api/schedule-api.ts` |
| **Modify** | `src/jes-lucky-pick-client/src/routes.tsx` |
| **Modify** | `src/jes-lucky-pick-client/src/components/layout/AppLayout.tsx` |

---

## Step-by-Step Implementation

### Step 1 — NuGet Packages

**`JesLuckyPick.Infrastructure.csproj`** — add:
```xml
<PackageReference Include="Hangfire.Core" Version="1.8.*" />
<PackageReference Include="Hangfire.PostgreSql" Version="1.20.*" />
```

**`JesLuckyPick.Api.csproj`** — add:
```xml
<PackageReference Include="Hangfire.AspNetCore" Version="1.8.*" />
```

---

### Step 2 — Domain Entity

**`TrainingSchedule.cs`**
```csharp
namespace JesLuckyPick.Domain.Entities;

public class TrainingSchedule
{
    public Guid Id { get; set; }
    public bool IsEnabled { get; set; }
    public string FrequencyType { get; set; } = "daily";  // "daily" | "weekly"
    // Bitmask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
    public int DaysOfWeekMask { get; set; }
    // JSON array of UTC time strings: ["00:00","12:00"]
    public string TimeSlotsJson { get; set; } = "[]";
    // Serialized scheduled game configuration (no historicalDraws — fetched at runtime)
    public string GameSettingsJson { get; set; } = "{}";
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
```

**`ITrainingScheduleRepository.cs`**
```csharp
public interface ITrainingScheduleRepository
{
    Task<TrainingSchedule?> GetAsync();           // single row (system-wide)
    Task<TrainingSchedule> UpsertAsync(TrainingSchedule schedule);
}
```

---

### Step 3 — EF Core Configuration & Context

**`TrainingScheduleConfiguration.cs`** — follows same pattern as `TrainingSessionConfiguration.cs`:
```csharp
builder.ToTable("training_schedules");
builder.HasKey(x => x.Id);
builder.Property(x => x.FrequencyType).HasMaxLength(10);
builder.Property(x => x.TimeSlotsJson).HasColumnType("jsonb");
builder.Property(x => x.GameSettingsJson).HasColumnType("jsonb");
builder.Property(x => x.CreatedAtUtc).HasDefaultValueSql("now()");
```

**`AppDbContext.cs`** — add:
```csharp
public DbSet<TrainingSchedule> TrainingSchedules => Set<TrainingSchedule>();
```

---

### Step 4 — Repository Implementation

**`TrainingScheduleRepository.cs`** — follows existing repository patterns (async, EF Core):
- `GetAsync()`: returns first row or null (there's only one system-wide schedule)
- `UpsertAsync()`: inserts if none exists, otherwise updates the existing row

---

### Step 5 — Backend Simulation (C# port of TypeScript strategies)

**`GameSimulatorService.cs`** — pure C# port of `utils/strategies.ts` + `useGameEngine.ts` logic:

```csharp
public class GameSimulatorService
{
    // Mirrors TypeScript: scoreGuess, pickRandom, pickTopConfidence, updateConfidenceMap
    // Mirrors strategies: Scanner, Sticky, Gambler, Analyst
    // RunSimulation(settings, historicalDraws) → SimulationResult
}

public record SimulationResult(
    string Result,        // "winner_found" | "all_eliminated" | "time_up"
    int TotalRounds,
    int TotalExperts,
    int SurvivingExperts,
    int DurationSeconds,
    string? WinnerJson,
    string LeaderboardJson,
    string SettingsJson
);
```

Strategy implementations mirror TypeScript exactly:
- `ScoreGuess(guess, secret)` — count intersection
- `PickRandom(min, max, size, exclude)` — random unique numbers
- `PickTopConfidence(confidenceMap, min, max, size, exclude)` — sorted by confidence
- `UpdateConfidenceMap(confidenceMap, guess, stars)` — delta: +0.3 (≥3★), +0.05 (1-2★), -0.2 (0★)
- `ScannerStrategy`, `StickyStrategy`, `GamblerStrategy`, `AnalystStrategy`
- Elimination: experts with `currentRoundScore < 2` eliminated at round end
- Win condition: `stars >= 5`
- Max rounds: 20 (safety cap)

---

### Step 6 — Scheduled Job

**`ScheduledTrainingJob.cs`** — Hangfire job (scoped):
```csharp
public class ScheduledTrainingJob(
    ITrainingScheduleRepository scheduleRepo,
    IDrawRepository drawRepo,
    ILottoGameRepository gameRepo,
    IUserRepository userRepo,
    ITrainingSessionRepository sessionRepo,
    GameSimulatorService simulator)
{
    public async Task RunAsync()
    {
        // 1. Load schedule → deserialize GameSettingsJson → ScheduledGameSettings
        // 2. Get LottoGame entity by game code
        // 3. Fetch latest 500 draws as historicalDraws (number[][])
        // 4. RunSimulation(settings, historicalDraws)
        // 5. Get first Admin user ID
        // 6. Save TrainingSession (UserId = admin, GameMode = "simulation", PlayedAt = UtcNow)
    }
}
```

**`ScheduledGameSettings`** record (subset — no browser-only fields):
```csharp
public record ScheduledGameSettings(
    string LottoGame,        // "6/42"
    int ManagerCount,
    int ExpertsPerManager,
    int TimeLimitMinutes,
    int CombinationSize,
    int NumberRangeMin,
    int NumberRangeMax,
    bool UseVeterans
);
```

---

### Step 7 — Scheduler Service

**`TrainingSchedulerService.cs`** — manages Hangfire recurring jobs:

```csharp
public class TrainingSchedulerService(IRecurringJobManager jobManager)
{
    private const string JobPrefix = "training-schedule";

    public void Apply(TrainingSchedule schedule)
    {
        RemoveAllJobs(schedule.Id);
        if (!schedule.IsEnabled) return;

        var slots = JsonSerializer.Deserialize<string[]>(schedule.TimeSlotsJson) ?? [];
        var days = BuildCronDaysList(schedule.FrequencyType, schedule.DaysOfWeekMask);

        foreach (var slot in slots)
        {
            var cron = BuildCron(slot, schedule.FrequencyType, days);
            var jobId = $"{JobPrefix}-{schedule.Id}-{slot.Replace(":", "")}";
            jobManager.AddOrUpdate<ScheduledTrainingJob>(jobId, j => j.RunAsync(), cron);
        }
    }
}
```

Cron examples:
- Daily 12:00 UTC → `0 12 * * *`
- Weekly Mon+Fri at 09:00 UTC → `0 9 * * 1,5`

DaysOfWeekMask mapping to cron (Mon=1…Sun=64 → cron Mon=1…Sun=0):
```
Mask bit → cron day: Mon=1→1, Tue=2→2, Wed=4→3, Thu=8→4, Fri=16→5, Sat=32→6, Sun=64→0
```

---

### Step 8 — DI Registration

**`DependencyInjection.cs`** — add:
```csharp
services.AddHangfire(config => config
    .UsePostgreSqlStorage(configuration.GetConnectionString("DefaultConnection")));
services.AddHangfireServer();

services.AddScoped<ITrainingScheduleRepository, TrainingScheduleRepository>();
services.AddScoped<ScheduledTrainingJob>();
services.AddScoped<GameSimulatorService>();
services.AddScoped<TrainingSchedulerService>();
```

---

### Step 9 — API Endpoints

**`ScheduleEndpoints.cs`** — all admin-only:
```
GET  /api/schedule          → TrainingScheduleResponse
PUT  /api/schedule          → save + TrainingSchedulerService.Apply()
POST /api/schedule/trigger  → BackgroundJob.Enqueue<ScheduledTrainingJob>(j => j.RunAsync())
```

---

### Step 10 — Program.cs changes

```csharp
app.MapScheduleEndpoints();
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = [new HangfireAdminAuthFilter()]  // JWT Admin check
});

// On startup: reload saved schedule into Hangfire (survives restarts)
var schedule = await scheduleRepo.GetAsync();
if (schedule != null) scheduler.Apply(schedule);
```

---

### Step 11 — EF Core Migration

```bash
dotnet ef migrations add AddTrainingSchedule \
  --project src/JesLuckyPick.Infrastructure \
  --startup-project src/JesLuckyPick.Api
dotnet ef database update \
  --project src/JesLuckyPick.Infrastructure \
  --startup-project src/JesLuckyPick.Api
```

---

### Step 12 — Frontend Time Conversion Utilities

The API always stores and returns times in **UTC**. The UI always shows and accepts times in the **browser's local timezone**. Add two pure utility functions in `schedule-api.ts` (or a shared `time-utils.ts`):

```typescript
/**
 * Convert a local HH:mm string (browser timezone) to UTC HH:mm.
 * e.g. "08:00" in UTC+8 → "00:00"
 */
export function localToUtcTime(localTime: string): string {
  const [h, m] = localTime.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/**
 * Convert a UTC HH:mm string to local HH:mm (browser timezone).
 * e.g. "00:00" UTC → "08:00" in UTC+8
 */
export function utcToLocalTime(utcTime: string): string {
  const [h, m] = utcTime.split(":").map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
```

These use native `Date` — no extra library needed. Day-boundary wrapping (e.g. 01:00 local UTC+8 = 17:00 UTC previous day) is handled correctly because cron only cares about the time-of-day, not the date.

---

### Step 13 — Frontend API Client

**`schedule-api.ts`**:
```typescript
export interface ScheduleConfig {
  id: string;
  isEnabled: boolean;
  frequencyType: "daily" | "weekly";
  daysOfWeekMask: number;  // Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
  timeSlots: string[];     // stored/sent as UTC HH:mm — converted to/from local in the UI layer
  gameSettingsJson: string;
  updatedAtUtc: string;
}

export async function getSchedule(): Promise<ScheduleConfig | null>
export async function saveSchedule(config: Omit<ScheduleConfig, "id" | "updatedAtUtc">): Promise<ScheduleConfig>
export async function triggerNow(): Promise<void>
```

**Conversion points** (both live in the page component, not in `schedule-api.ts`):

| Event | Conversion |
|-------|-----------|
| Load from API (`useQuery` success) | `utcToLocalTime()` applied to each slot before populating form |
| Submit to API (`useMutation`) | `localToUtcTime()` applied to each slot before calling `saveSchedule()` |

The API client itself is timezone-agnostic — it passes strings as-is. The page component owns the conversion.

---

### Step 14 — Frontend Page

**`TrainingSchedulePage.tsx`** — React Hook Form + Zod, `useFieldArray` for time slots:

```
┌──────────────────────────────────────────────┐
│  Training Schedule                           │
│                                              │
│  Enable Schedule  [toggle]                   │
│                                              │
│  Frequency:  ● Daily   ○ Weekly              │
│                                              │
│  Days (hidden when Daily):                   │
│  [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]   │
│                                              │
│  Time Slots (local time)       [+ Add Time]  │
│  ┌──────────────────┬──────┐                 │
│  │  08:00  (UTC+8)  │ [×]  │  ← local input  │
│  │  20:00  (UTC+8)  │ [×]  │                 │
│  └──────────────────┴──────┘                 │
│  Stored as UTC · displayed in your timezone  │
│                                              │
│  Game Settings                               │
│  Managers [3]  Experts/Mgr [4]               │
│  Time (min) [5]  Lotto Game [6/42 ▼]         │
│                                              │
│  [Trigger Now]        [Save Schedule]        │
└──────────────────────────────────────────────┘
```

- `useQuery` loads UTC slots from API → `utcToLocalTime()` → populates form fields
- `useMutation` on submit → `localToUtcTime()` each slot → calls `saveSchedule()`
- Small helper text below the grid: `"Times entered in your local timezone (UTC±X) — saved as UTC"`
- Use `Intl.DateTimeFormat().resolvedOptions().timeZone` to show the browser's IANA timezone name in the helper text (e.g. "Asia/Manila")
- Days section hidden (not disabled) when `frequencyType === "daily"`
- `useFieldArray` for dynamic time slot rows
- Each slot: `<Input type="time">` (native, outputs HH:mm in local time)
- Inline success/error (matches SettingsPage pattern)
- Zod: ≥1 time slot, weekly requires ≥1 day selected

**Scheduled runs are simulation-only** — no AI Agent option on this page.

---

### Step 15 — Routing & Navigation

**`routes.tsx`**:
```tsx
<Route path="training-schedule" element={<TrainingSchedulePage />} />
```

**`AppLayout.tsx`** — add after Model Training in admin section:
```tsx
import { Clock } from "lucide-react";
// ...
<SidebarMenuItem>
  <SidebarMenuButton asChild isActive={location.pathname === "/training-schedule"} tooltip="Training Schedule">
    <NavLink to="/training-schedule"><Clock /><span>Training Schedule</span></NavLink>
  </SidebarMenuButton>
</SidebarMenuItem>
```

---

## Data Flow: Save → Execute

```
User clicks Save
  → PUT /api/schedule
  → TrainingSchedule upserted in DB
  → TrainingSchedulerService.Apply()
      → removes old Hangfire recurring jobs
      → re-registers jobs with new cron expressions
  → Hangfire fires at scheduled UTC time
      → ScheduledTrainingJob.RunAsync()
          → fetches historical draws
          → GameSimulatorService.RunSimulation()
          → saves TrainingSession (admin user, GameMode="simulation")
          → appears in Model Training history grid
```

---

## Verification

1. `dotnet test` — unit tests for `GameSimulatorService` (strategy logic, elimination, win) and `TrainingSchedulerService.BuildCron()`
2. `npx tsc --noEmit` — zero type errors
3. `npx vitest run` — frontend tests pass
4. Manual E2E:
   - Set Daily schedule, time = 1 min from now (UTC), save → check `/hangfire` dashboard → verify new TrainingSession in history
   - Disable schedule → verify Hangfire jobs removed
   - Test Weekly with specific days, verify cron in dashboard
5. `dotnet ef database update` → verify `training_schedules` table created

---

## Key Design Decisions

- **Simulation-only** for scheduled runs — AI Agent requires Claude CLI + live SignalR session, not viable headless
- **Single system-wide schedule** — one DB row, admin-only feature
- **Admin user ID** for TrainingSession.UserId — avoids making FK nullable
- **Hangfire over Quartz.NET** — simpler API, uses same PostgreSQL connection string, has built-in dashboard
- **`<input type="time">`** — browser-native, outputs HH:mm, no library needed
- **`useFieldArray`** — React Hook Form native pattern for dynamic time slot list
