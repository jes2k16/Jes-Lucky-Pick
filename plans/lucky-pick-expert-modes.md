# Lucky Pick: Simulation & AI Agent Expert Modes

## Context
The Lucky Pick Generator currently supports 6 statistical/AI strategies (Combined, Frequency, HotCold, Gap, AiWeighted, ClaudeAi). The project already has a full AI Training system with 4 expert personalities (Scanner, Sticky, Gambler, Analyst) running in two modes — Simulation (client-side strategy logic) and AI Agent (Claude CLI via SignalR GameHub). The goal is to expose those same expert modes directly on the Lucky Pick page so users can select a mode + personality to generate lucky pick numbers using trained expert logic with optional veteran career data.

---

## UI Changes — `LuckyPickPage.tsx`

Replace "Strategy" section with a **3-tab mode selector** (Shadcn `Tabs`):
- **Standard** — existing 6-strategy dropdown (unchanged)
- **Simulation** — expert personality select + veteran toggle
- **AI Agent** — expert personality select + model select + veteran toggle

New state:
```typescript
type PickMethod = "standard" | "simulation" | "agent";
const [method, setMethod] = useState<PickMethod>("standard");
const [expertPersonality, setExpertPersonality] = useState<ExpertPersonality>("Scanner");
const [aiModel, setAiModel] = useState("claude-haiku-4-5-20251001");
const [useVeteran, setUseVeteran] = useState(false);
```

**Veteran lookup** — pick the most-experienced career for the chosen personality in "6/42":
```typescript
function findVeteranCareer(registry, personality): ExpertCareer | null {
  return registry.experts
    .filter(e => e.personality === personality && (e.byLottoGame["6/42"]?.gamesPlayed ?? 0) > 0)
    .sort((a, b) => b.byLottoGame["6/42"].gamesPlayed - a.byLottoGame["6/42"].gamesPlayed)[0] ?? null;
}
```

If `useVeteran` is true but no career found for the personality, show:
`<p className="text-xs text-muted-foreground">No veteran data for {personality} — using fresh confidence map.</p>`

**Three mutations** (replace the single existing mutation):
- `strategyMutation` — existing `POST /api/predictions/generate` (unchanged)
- `simulationMutation` — runs strategy locally → `POST /api/predictions/save`
- `agentMutation` — calls `POST /api/predictions/agent`

**Simulation generation** (client-side):
```typescript
import { executeStrategy } from "@/features/ai-training/utils/strategies";
import { buildSeededConfidenceMap } from "@/features/ai-training/hooks/useExpertRegistry";

const career = useVeteran ? findVeteranCareer(registry, personality) : null;
const confidenceMap = career
  ? buildSeededConfidenceMap(career, "6/42", minimalSettings)
  : initializeConfidenceMap(minimalSettings);

const expert: Expert = { id: "lp", name: "LuckyPick", managerId: "", personality,
  status: "active", confidenceMap, tryHistory: [], roundHistory: [],
  roundScores: [], eliminatedAtRound: null, currentRoundScore: 0 };

const numbers = executeStrategy(expert, minimalSettings, 1); // tryNumber=1
```

Confidence score = average confidence of picked numbers (normalized to 0–100).
Reasoning prefix: `[Personality: {personality}]` + (if veteran) `[Veteran: {gamesPlayed} games]`.

**History table** — extend strategy cell to show `Simulation` or `AI Agent` badge + personality sub-badge (and model for agent):
```typescript
function extractPersonality(reasoning: string): string | null {
  return reasoning.match(/\[Personality: (.+?)\]/)?.[1] ?? null;
}
```

**Imports to add** in `LuckyPickPage.tsx`:
- `useExpertRegistry` from `@/features/ai-training/hooks/useExpertRegistry`
- `buildSeededConfidenceMap` (exported from same hook)
- `executeStrategy` from `@/features/ai-training/utils/strategies`
- `initializeConfidenceMap` from ai-training hooks/utils
- Types: `ExpertPersonality`, `GameSettings`, `Expert` from `@/features/ai-training/types/game`
- `Switch` from `@/components/ui/switch`
- `Tabs, TabsList, TabsTrigger` from `@/components/ui/tabs`

---

## Backend Changes

### 1. `src/JesLuckyPick.Domain/Enums/PredictionStrategy.cs`
Add two values:
```csharp
SimulationExpert = 6,
AgentExpert = 7,
```

### 2. `src/JesLuckyPick.Application/Features/Predictions/DTOs/PredictionDtos.cs`
Add two request records:
```csharp
public record SavePredictionRequest(
    string GameCode,
    short[] Numbers,
    string Strategy,       // "SimulationExpert"
    decimal ConfidenceScore,
    string Reasoning);

public record GenerateAgentPredictionRequest(
    string GameCode,
    string Personality,
    string Model,
    int Count = 1,
    string ConfidenceMapJson = "{}",
    string CareerContextJson = "");
```

### 3. `src/JesLuckyPick.Application/Common/Interfaces/IExpertAgentService.cs` *(new)*
```csharp
public interface IExpertAgentService
{
    Task<PredictionResponse> GeneratePickAsync(
        string personality, string model,
        string confidenceMapJson, string careerContextJson,
        CancellationToken ct = default);
}
```

### 4. `src/JesLuckyPick.Infrastructure/AI/Services/ExpertAgentService.cs` *(new)*
- Injects `AppDbContext`
- Fetches `AgentPrompt` for `Role="Expert"`, `Personality=personality`, `IsActive=true`
- Fills placeholders: `{combinationSize}` = 6, `{numberRange}` = "1-42", `{roundNumber}` = 1, `{tryNumber}` = 1, `{confidenceMap}` = confidenceMapJson, `{tryHistory}` = "[]"
- Prepends careerContextJson if non-empty
- Runs Claude CLI (reuse `FindClaudeCli` + `CreateClaudeStartInfo` pattern from `ClaudeAiPredictionService`)
- Parses first `[...]` array from output as `int[]`
- Returns `PredictionResponse` with strategy `"AgentExpert"` and reasoning `[Personality: {personality}] [Model: {displayName}] ...`
- 60s timeout, throws `InvalidOperationException` on failure

> **Note**: Extract Claude path resolution and process execution into a shared static helper `ClaudeCliRunner` in the Infrastructure layer to avoid duplication across `ClaudeAiPredictionService`, `GameHub`, and `ExpertAgentService`.

### 5. `src/JesLuckyPick.Infrastructure/DependencyInjection.cs`
Register: `services.AddScoped<IExpertAgentService, ExpertAgentService>();`

### 6. `src/JesLuckyPick.Api/Endpoints/PredictionEndpoints.cs`
Add two new routes inside the existing `MapPredictionEndpoints`:

**`POST /save`** — persist client-generated simulation picks:
```csharp
group.MapPost("/save", async (SavePredictionRequest req, ...) => {
    // validate numbers: exactly 6, in range 1-42, unique
    // parse strategy enum (SimulationExpert)
    // persist Prediction entity
    // return PredictionResponse
});
```

**`POST /agent`** — backend AI agent generation:
```csharp
group.MapPost("/agent", async (GenerateAgentPredictionRequest req,
    IExpertAgentService agentService, ...) => {
    var game = await gameRepo.GetByCodeAsync(req.GameCode);
    // loop req.Count times:
    //   call agentService.GeneratePickAsync(req.Personality, req.Model, ...)
    //   persist Prediction with Strategy = AgentExpert
    // return PredictionResponse[]
});
```

No Admin role required — standard `RequireAuthorization()` from the group.

---

## Frontend API Changes — `predictionApi.ts`
Add two functions:
```typescript
export async function savePrediction(params: {
  gameCode: string; numbers: number[]; strategy: string;
  confidenceScore: number; reasoning: string;
}): Promise<PredictionResponse[]>   // POST /predictions/save

export async function generateAgentPrediction(params: {
  gameCode: string; personality: string; model: string;
  count?: number; confidenceMapJson?: string; careerContextJson?: string;
}): Promise<PredictionResponse[]>   // POST /predictions/agent
```

---

## Tests

### Backend — `tests/JesLuckyPick.Application.Tests/`

**Extend** `PredictionOrchestratorServiceTests.cs`:
```csharp
[Fact]
public async Task SimulationExpert_StrategyString_FallsToCombined()
// orchestrator doesn't know SimulationExpert, falls back to Combined
```

**New** `ExpertAgentServiceTests.cs`:
- `GeneratePickAsync_WhenNoActivePrompt_ThrowsInvalidOperationException`
- `ParseAgentResponse_ValidArray_ReturnsCorrectNumbers` (static parse method, no process needed)
- `ParseAgentResponse_PrefixesPersonalityInReasoning`

### Frontend — Vitest
**Extend** `LuckyPickPage.test.tsx` (or create if missing):
- Mode tabs render correctly
- Simulation mode shows personality select + veteran toggle, hides strategy select
- AI Agent mode shows personality + model + veteran toggle
- `findVeteranCareer` returns most-experienced career for personality
- `extractPersonality` parses `[Personality: Scanner]` correctly

---

## No DB Migration Required
`predictions.strategy` stores the enum ordinal as integer — adding `SimulationExpert = 6` and `AgentExpert = 7` is backward-compatible. Existing rows are unaffected.

---

## Critical Files
| File | Action |
|---|---|
| `src/jes-lucky-pick-client/src/features/lucky-pick/pages/LuckyPickPage.tsx` | Major UI + logic rewrite |
| `src/jes-lucky-pick-client/src/features/lucky-pick/api/predictionApi.ts` | Add 2 API functions |
| `src/JesLuckyPick.Domain/Enums/PredictionStrategy.cs` | Add 2 enum members |
| `src/JesLuckyPick.Application/Features/Predictions/DTOs/PredictionDtos.cs` | Add 2 request records |
| `src/JesLuckyPick.Application/Common/Interfaces/IExpertAgentService.cs` | New interface |
| `src/JesLuckyPick.Infrastructure/AI/Services/ExpertAgentService.cs` | New service |
| `src/JesLuckyPick.Infrastructure/DependencyInjection.cs` | Register service |
| `src/JesLuckyPick.Api/Endpoints/PredictionEndpoints.cs` | Add 2 endpoints |
| `tests/.../ExpertAgentServiceTests.cs` | New unit tests |

---

## Verification
1. `dotnet test` — all tests pass
2. `npx vitest run` — all frontend tests pass
3. `npx tsc --noEmit` — zero type errors
4. **Standard mode**: generate a prediction — behavior identical to before
5. **Simulation mode**: select Scanner, 3 sets, no veteran → 3 result cards appear with `[Personality: Scanner]` in reasoning; history table shows `Simulation` + `Scanner` badges
6. **Simulation + veteran**: run AI Training first to build a career, enable veteran toggle → numbers weighted by career confidence map
7. **AI Agent mode**: select Gambler, Haiku model → result has `AgentExpert` strategy, `[Personality: Gambler]` + `[Model: Haiku 4.5]` in reasoning
8. **No veteran data**: enable veteran toggle when no career exists → info note shown, generation still works
