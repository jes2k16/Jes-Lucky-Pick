# Training Schedule — Phase 2 Enhancements

## Context

Phase 1 (complete): Backend (Hangfire, `TrainingSchedule` entity, `ScheduledTrainingJob`, API endpoints, EF migration) and frontend (`TrainingSchedulePage`, `schedule-api.ts`, routing, nav) are fully built and deployed.

Phase 2 (this plan): Four UX enhancements requested:
1. **Schedule history grid**: Running/completed scheduled sessions visible in a new grid on the schedule page; clicking a "running" row navigates to the live game in Model Training.
2. **Trigger Now UX**: Starts a client-side simulation (watchable), shows "Successfully started — view it?" dialog with navigation.
3. **Two-column layout**: Left = schedule form (current design), Right = paginated sortable history grid of scheduled sessions only.
4. **Auto-refresh**: Saving the schedule automatically refreshes the history grid.

**Key architectural decision for Trigger Now:** The current implementation enqueues a Hangfire background job (server-side, instant, no live view). The new design changes "Trigger Now" to start a **client-side simulation** using the same game engine as Model Training so the user can watch it live. Auto-scheduled Hangfire cron runs remain server-side (silent background saves). A new `GameMode = "scheduled"` distinguishes both from manual simulations and filters the schedule history grid.

---

## Architecture Overview

```
Trigger Now (new)
  → reads current form settings
  → fetches 500 historical draws (GET /api/draws?pageSize=500)
  → calls trainingSessionStore.startSession(settings) → isGameActive = true
  → shows "Training started! View it?" dialog
  → "Yes" → navigate('/model-training') → game is live in AiTrainingPage

Auto-scheduled Hangfire cron
  → ScheduledTrainingJob.RunAsync() — GameMode = "scheduled" (changed from "simulation")
  → saves completed TrainingSession to DB

Schedule History Grid (right side)
  → GET /api/training/sessions?gameMode=scheduled&page=1&pageSize=50
  → shows completed + running sessions (running = trainingSessionStore.isGameActive)
  → running row at top → click → navigate('/model-training')
  → sortable columns (client-side on current page), paginated server-side
```

---

## Files to Modify

### Backend

| Action | File |
|--------|------|
| **Modify** | `src/JesLuckyPick.Infrastructure/Training/ScheduledTrainingJob.cs` |
| **Modify** | `src/JesLuckyPick.Domain/Interfaces/ITrainingSessionRepository.cs` |
| **Modify** | `src/JesLuckyPick.Infrastructure/Persistence/Repositories/TrainingSessionRepository.cs` |
| **Modify** | `src/JesLuckyPick.Api/Endpoints/TrainingEndpoints.cs` |

### Frontend

| Action | File |
|--------|------|
| **Modify** | `src/jes-lucky-pick-client/src/features/ai-training/types/game.ts` |
| **Modify** | `src/jes-lucky-pick-client/src/features/schedule/api/schedule-api.ts` |
| **Modify** | `src/jes-lucky-pick-client/src/features/schedule/pages/TrainingSchedulePage.tsx` |
| **Create** | `src/jes-lucky-pick-client/src/features/schedule/components/ScheduleHistoryGrid.tsx` |

---

## Step-by-Step Implementation

### Step 1 — Backend: Change GameMode to "scheduled"

**`ScheduledTrainingJob.cs`** — change `GameMode = "simulation"` to `GameMode = "scheduled"`.

---

### Step 2 — Backend: Add `gameMode` filter to training sessions

**`ITrainingSessionRepository.cs`** — add optional `gameMode` parameter:
```csharp
Task<(IReadOnlyList<TrainingSession> Items, int TotalCount)> GetByUserPagedAsync(
    Guid userId, int page, int pageSize,
    string? gameMode = null,
    CancellationToken ct = default);
```

**`TrainingSessionRepository.cs`** — implement filter:
```csharp
var query = context.TrainingSessions.Where(s => s.UserId == userId);
if (gameMode is not null)
    query = query.Where(s => s.GameMode == gameMode);
```

**`TrainingEndpoints.cs`** — add `string? gameMode = null` query param, pass to repository.

---

### Step 3 — Frontend: Add "scheduled" to GameMode

**`types/game.ts`**:
```typescript
export type GameMode = "simulation" | "ai-agent" | "scheduled";
```

---

### Step 4 — Frontend: Update schedule-api.ts

Add types and `getScheduleHistory(page, pageSize)`:
```typescript
export interface ScheduleHistoryItem {
  id: string; playedAt: string; result: string;
  winnerJson: string | null; totalRounds: number;
  durationSeconds: number; totalExperts: number; survivingExperts: number;
}
export interface ScheduleHistoryPage {
  items: ScheduleHistoryItem[]; totalCount: number; page: number; pageSize: number;
}
export async function getScheduleHistory(page: number, pageSize: number): Promise<ScheduleHistoryPage> {
  const res = await apiClient.get("/training/sessions", { params: { page, pageSize, gameMode: "scheduled" } });
  return res.data;
}
```

---

### Step 5 — Frontend: Create ScheduleHistoryGrid component

**`src/jes-lucky-pick-client/src/features/schedule/components/ScheduleHistoryGrid.tsx`**

Columns (client-side sort on current page): Date | Result badge | Winner | Rounds | Duration

Features:
- "Currently Running" indicator at top when `isGameActive && gameSettings?.gameMode === "scheduled"` — pulsing green dot + "View Live →" button → `navigate('/model-training')`
- Server-side pagination: 50/page default, options [25, 50, 100]
- Result badges: winner_found=green, all_eliminated=red, time_up=amber
- Winner column: parse `winnerJson` for `expertName`, or "—"
- Query key: `["schedule-history", page, pageSize]`

---

### Step 6 — Frontend: Two-column layout in TrainingSchedulePage

```
┌──────────────────────────────────────────────────────────────────────┐
│  🕐 Training Schedule                                                │
├───────────────────────────┬──────────────────────────────────────────┤
│  LEFT w-[420px] shrink-0  │  RIGHT flex-1 min-w-0                    │
│  (form — current design)  │  <ScheduleHistoryGrid />                 │
└───────────────────────────┴──────────────────────────────────────────┘
```

Outer wrapper: `<div className="flex gap-6 min-h-0">`

---

### Step 7 — Frontend: Trigger Now → client-side simulation

Replace `handleTrigger` to:
1. Run RHF `trigger()` validation
2. Fetch 500 draws (`fetchDraws` from `@/features/history/api/drawsApi`)
3. Build `GameSettings` with `gameMode: "scheduled"`, `simulationSpeedMs: 200`
4. Call `startSession(settings)` from `useTrainingSessionStore`
5. Set `showTriggerDialog = true`

Inline dialog (no modal):
```tsx
{showTriggerDialog && (
  <div className="rounded-lg border bg-card p-4 space-y-3">
    <div className="flex items-center gap-2 text-sm font-medium">
      <CheckCircle2 className="h-4 w-4 text-green-500" />
      Training started successfully!
    </div>
    <p className="text-xs text-muted-foreground">Would you like to watch the ongoing training?</p>
    <div className="flex gap-2">
      <Button size="sm" onClick={() => navigate("/model-training")}>Yes, Watch it</Button>
      <Button size="sm" variant="outline" onClick={() => setShowTriggerDialog(false)}>No, Stay here</Button>
    </div>
  </div>
)}
```

---

### Step 8 — Frontend: Auto-refresh on save

In `saveMutation.onSuccess`:
```typescript
queryClient.invalidateQueries({ queryKey: ["schedule-history"] });
```

---

## Verification

1. `dotnet test --configuration Release` — 49/49 pass
2. `npx tsc --noEmit` — 0 errors
3. `npx vitest run` — no regressions
4. Manual E2E: two-column layout, trigger → dialog → navigate → live game, game ends → session in grid, save → grid refreshes
