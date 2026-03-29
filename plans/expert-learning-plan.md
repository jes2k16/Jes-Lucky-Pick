# Plan: Persistent Expert Learning Across Games

## Context

Currently, experts are born and die within a single game. The only cross-game reuse is a manual winner-profile import (one expert, one game at a time). The user wants experts to accumulate experience over many games — win/loss records, learned number preferences — so that future games benefit from a growing pool of veterans, not always starting from zero.

Additionally, the current game history (`useGameHistory.ts`) only saves to localStorage. We need a **hybrid storage** approach: localStorage for instant reads and database persistence for durability and cross-device access.

---

## Core Insight

The `confidenceMap` is the learning state of an expert. It already updates every try within a game. The natural extension is to **persist and accumulate it across games** — a veteran expert starts with non-zero beliefs because past games taught it which numbers tend to score.

The design has three concerns:
1. **Expert Registry** — a persistent store of expert "personas" with career stats + accumulated confidence
2. **Game Log & Data Capture** — full game logs, winner profiles, leaderboards, and export/download
3. **Hybrid Storage** — localStorage for speed, database for durability; sync between them

---

## Conceptual Design

### What persists per expert (career data)
```
ExpertCareer {
  id              — stable UUID, never changes
  name            — permanent (Alpha, Bravo, …)
  personality     — permanent (Scanner / Sticky / Gambler / Analyst)
  gamesPlayed     — total games entered
  wins            — times this expert found the winning combination
  eliminations    — times eliminated during a game
  totalRoundsPlayed
  bestEverScore   — highest single-try star count across all games
  avgRoundScore   — running average across all completed rounds
  byLottoGame: {
    "6/42": {
      gamesPlayed, wins, eliminations,
      cumulativeConfidenceMap: Record<number, number>   ← THE KEY DATA
    }
    // other lotto types when they become active
  }
  lastPlayedAt    — ISO timestamp
}
```

The `cumulativeConfidenceMap` per lotto game is what makes veterans useful. It answers: "across all the times this expert has played 6/42, which numbers kept appearing in high-scoring tries?"

### Accumulation formula (after each game)
```
cumulative[n] = cumulative[n] * 0.7 + gameResult[n] * 0.3
```
A **decay factor of 0.7** means recent games have more influence than old ones. This prevents stale games from dominating. The 0.3 weight for the just-finished game keeps learning alive without overwriting history.

---

## Data Capture & Winner Export

### Full Game Log
The existing `GameHistoryEntry` in `useGameHistory.ts` already captures most of what's needed. Extend it to also persist to the database. The game log includes:
- Game settings, duration, result (winner_found / all_eliminated / time_up)
- Winner info (expert name, personality, winning guess, stars, rounds played)
- Winner profile (confidenceMap + full tryHistory for re-import)
- Full leaderboard (all experts ranked by best score)

### Winner Summary & Journey
On the Results screen (already exists), add:
- **Winner journey visualization**: round-by-round score progression for the winning expert
- **Confidence map heatmap**: visual showing which numbers the winner learned to trust
- **Key turning points**: rounds where the winner made significant score jumps

### Download / Export
- **"Download Winner Profile" button** — exports JSON with confidenceMap, personality, fullHistory, secret combination, game settings (already exists as `WinnerProfile` type)
- **"Download Full Game Log" button** — exports the complete `GameHistoryEntry` as JSON
- Both available on the Results screen and from the Game History grid

### Import
- The existing "Import Profile" on the setup screen seeds a new expert from a previously exported winner JSON
- With veteran mode, this is less critical since careers auto-persist, but still useful for sharing between users/devices

---

## Hybrid Storage Design

### Principle
**Write to both, read from localStorage first, fall back to API.**

localStorage gives instant UI responsiveness. The database ensures data survives browser clears, works across devices, and supports admin views.

### Storage Layers

#### Layer 1: localStorage (fast, ephemeral)
- **Expert Registry**: key `"jes-expert-registry"` — `ExpertRegistry { version, experts: ExpertCareer[] }`
- **Game History**: key `"jes-number-training-history"` — existing `GameHistoryEntry[]` (max 5000)
- Read on page load for instant display, no network wait

#### Layer 2: Database (durable, authoritative)
New entities in the backend:

```
TrainingSession {
  Id              — Guid
  UserId          — FK to User
  GameMode        — "simulation" | "ai-agent"
  LottoGameCode   — "6/42" etc.
  Result          — "winner_found" | "all_eliminated" | "time_up"
  DurationSeconds — int
  TotalRounds     — int
  TotalExperts    — int
  SurvivingExperts — int
  SettingsJson    — JSON blob of GameSettings
  WinnerJson      — JSON blob of WinnerInfo (nullable)
  LeaderboardJson — JSON blob of LeaderboardEntry[]
  PlayedAt        — DateTime
  CreatedAt       — DateTime
}

ExpertCareer {
  Id              — Guid
  UserId          — FK to User
  Name            — string (Alpha, Bravo, …)
  Personality     — string (Scanner / Sticky / Gambler / Analyst)
  GamesPlayed     — int
  Wins            — int
  Eliminations    — int
  TotalRoundsPlayed — int
  BestEverScore   — int
  AvgRoundScore   — decimal
  LastPlayedAt    — DateTime
  CreatedAt       — DateTime
  UpdatedAt       — DateTime
}

ExpertLottoStats {
  Id              — Guid
  ExpertCareerId  — FK to ExpertCareer
  LottoGameCode   — string ("6/42")
  GamesPlayed     — int
  Wins            — int
  Eliminations    — int
  ConfidenceMapJson — JSON blob of Record<number, number>
  GameMemoriesJson  — JSON blob of GameMemory[] (last 20 games stored in full detail)
  CareerSummaryJson — JSON blob summarizing games older than the 20 stored (total stats, recurring numbers, trend)
  UpdatedAt       — DateTime
}

GameMemory (stored as JSON inside ExpertLottoStats.GameMemoriesJson) {
  gameId           — Guid, links to TrainingSession
  playedAt         — ISO timestamp
  result           — "won" | "eliminated_round_N" | "survived_time_up"
  roundsPlayed     — int
  bestScore        — int (best single-try stars)
  bestGuess        — int[] (the numbers that scored highest)
  secretCombo      — int[] (Manager's secret, revealed post-game)
  matchedNumbers   — int[] (which of bestGuess were correct)
  topConfidence    — int[] (top 5 numbers by confidence at game end)
  bottomConfidence — int[] (bottom 5 numbers by confidence at game end)
  lesson           — string (AI-generated one-line insight, or auto-generated for simulation mode)
}
```

### Sync Strategy

#### On game end (write path):
1. Save to localStorage immediately (existing behavior, instant)
2. Fire-and-forget API call to persist to database
3. If API fails, data is safe in localStorage; retry on next app load

#### On page load (read path):
1. Load from localStorage instantly → render UI
2. Background fetch from API to check for newer data (e.g., played on another device)
3. If API data is newer (compare `lastPlayedAt` / `playedAt`), merge into localStorage and re-render

#### Merge rules:
- **Expert careers**: API wins if `lastPlayedAt` is more recent; otherwise localStorage wins
- **Game history**: union of both sets (deduplicate by `id`), keep most recent 5000
- **Conflict resolution**: the record with the higher `gamesPlayed` count is authoritative

---

## Simulation Mode vs AI Agent Mode

### Simulation Mode — confidence-driven
The strategy functions (`executeStrategy`) already read `expert.confidenceMap` to pick numbers. If a veteran expert starts with a non-zero cumulative map, every strategy automatically benefits:
- **Scanner** will test numbers it hasn't explored in prior games first
- **Sticky** will lock in numbers that historically scored
- **Analyst** will weight sections where its cumulative map is highest
- **Gambler** will still randomize, but its tie-breaking will favor known-good numbers

**No strategy code changes needed.** Just seed the `confidenceMap` from the career record at game start.

Additional simulation enhancement: if `wins / gamesPlayed > 0.3` (high performer), slightly pre-boost the expert's top-confidence numbers by a small multiplier at game start — a "veteran's edge."

### AI Agent Mode — context-driven

The AI (Claude) doesn't read `confidenceMap` mechanically — it reads the system prompt and *reasons*. But right now, each game starts with an empty `tryHistory` and zero-confidence map. A "veteran" AI expert that can't remember its past games is no veteran at all.

**The problem**: The current prompt gives the AI only `{tryHistory}` (current game) and `{confidenceMap}` (current game). When a new game starts, both reset to zero. The AI has amnesia.

**The solution**: Inject a **career memory block** into the prompt that gives the AI its full cross-game history in a structured, reasoning-friendly format. This is not a flat summary — it's layered context that lets the AI build on past experience.

#### What the AI needs to remember (career memory)

Each expert's `ExpertLottoStats` stores a new field: `gameMemories` — a compact log of what happened in each past game, specifically what the expert *learned*.

```
GameMemory {
  gameId           — links back to TrainingSession
  playedAt         — ISO timestamp
  result           — "won" | "eliminated_round_3" | "survived_time_up"
  roundsPlayed     — how far the expert got
  bestScore        — best single-try stars in that game
  bestGuess        — the actual numbers that scored highest
  secretCombo      — the Manager's secret (revealed post-game)
  matchedNumbers   — which of the expert's best guess were correct
  topConfidence    — top 5 numbers by confidence at game end
  bottomConfidence — bottom 5 numbers by confidence at game end
  lesson           — one-line AI-generated insight (see below)
}
```

**Why `lesson`?**: After each game ends, we ask Claude to write a one-line lesson from the game. Example: *"Numbers 7, 14, 22 appeared in 3/5 of my high-scoring tries — likely part of the secret."* This is stored and replayed in future games so the AI can build on its own reasoning, not just raw data.

#### Career context prompt (injected before the personality prompt)

```
[YOUR CAREER HISTORY — {name} the {personality}]
You are a veteran expert. You have played {gamesPlayed} games of 6/42.
Win rate: {wins}/{gamesPlayed} ({winRate}%). Eliminations: {eliminations}.
Best ever score: {bestEverScore}★.

[CUMULATIVE KNOWLEDGE]
Numbers you trust most (high cumulative confidence): {top10Numbers with scores}
Numbers you avoid (low cumulative confidence): {bottom10Numbers with scores}
Numbers you haven't tested enough: {leastTestedNumbers}

[GAME-BY-GAME MEMORY — most recent {maxGames} games]
Game 1 ({playedAt}): {result}. Best: {bestScore}★ with [{bestGuess}].
  Secret was [{secretCombo}]. You matched: [{matchedNumbers}].
  Lesson: "{lesson}"

Game 2 ({playedAt}): {result}. Best: {bestScore}★ with [{bestGuess}].
  Secret was [{secretCombo}]. You matched: [{matchedNumbers}].
  Lesson: "{lesson}"

... (up to last 10 games)

[PATTERNS YOU SHOULD NOTICE]
- Numbers that appeared in multiple secrets: {recurringSecretNumbers}
- Numbers that appeared in your best guesses across games: {recurringBestGuessNumbers}
- Your win/elimination trend: {last5Results} (e.g., "E, E, W, E, W")

[INSTRUCTIONS]
Use your career history to inform your strategy. You are not starting from zero —
you have experience. Lean on numbers you've seen succeed, but don't ignore new
possibilities. Your personality is {personality}, so apply your approach to this
accumulated knowledge.
```

#### Why each section matters

| Section | Purpose |
|---|---|
| **Career summary** | Tells the AI how experienced it is — a 50-game veteran reasons differently than a 2-game rookie |
| **Cumulative knowledge** | The distilled confidence map — which numbers have earned trust over time |
| **Game-by-game memory** | The actual trial-and-error history — the AI can see what it tried, what worked, what the secret actually was, and what lesson it drew |
| **Patterns** | Pre-computed cross-game analysis so the AI doesn't have to rediscover it — "number 14 appeared in 4 of your last 10 secrets" |
| **Instructions** | Frames the AI's mindset — you're experienced, use it |

#### Post-game lesson generation

After each game ends, before saving the career update, make one additional Claude call:

```
You just finished a 6/42 game as "{name}" (personality: {personality}).
Your best try scored {bestScore}★ with [{bestGuess}].
The secret was [{secretCombo}]. You matched [{matchedNumbers}].
Your full try history this game: {tryHistory}

Write ONE sentence summarizing what you learned. Focus on which numbers
showed promise and which were dead ends. Be specific and actionable
for your future self.
```

The response (e.g., *"14 and 28 appeared in all my 3+ star tries while 1-9 never scored — focus on mid-range numbers"*) is stored in `GameMemory.lesson` and replayed in future games.

#### Prompt size management — progressive compression

Every game matters. We never throw away history — we **compress** it as it ages. The AI sees its entire career, just at different resolutions:

**Tier 1 — Full detail (last 5 games)**
```
Game 48 (2026-03-28): Won at round 6. Best: 5★ with [7, 14, 22, 28, 35, 41].
  Secret was [7, 14, 22, 28, 35, 41]. You matched: [7, 14, 22, 28, 35].
  Lesson: "Mid-range cluster 14-28-35 is the backbone — build around it."
```

**Tier 2 — Condensed (games 6–20)**
```
Games 29-47 (19 games): 3 wins, 9 eliminations, 7 survived.
  Avg best score: 3.2★. Recurring high-confidence: [14, 22, 28, 35].
  Key lessons: "14 appeared in 6 secrets", "Low numbers 1-9 rarely score."
```

**Tier 3 — Summary (games 21+)**
```
Early career (games 1-28): 28 games, 2 wins, 15 eliminations.
  Win rate: 7%. Numbers that appeared in winning combos: [14, 22, 35].
  Overall trend: started random, gradually converged on mid-range numbers.
```

This way a 50-game veteran's entire career fits in ~800 tokens:
- Tier 1: ~5 games × 60 tokens = 300 tokens
- Tier 2: ~15 games compressed into 150 tokens
- Tier 3: remaining games in 100 tokens
- Career summary + patterns: ~250 tokens

**The compression happens at prompt-build time, not at storage time.** All 20 game memories in `GameMemoriesJson` are stored in full detail. The tiering only applies when building the career context string for the prompt. If the expert has more than 20 stored memories, the oldest are pre-summarized into a `careerSummary` field on `ExpertLottoStats` during the post-game save.

#### How each personality uses career data differently

The career context is identical for all personalities — but each personality's strategy prompt tells it to *apply* the data differently:
- **Scanner**: "You have career data showing which numbers you've already tested extensively. Focus your exploration on untested numbers, but verify your high-confidence numbers periodically."
- **Sticky**: "Your career data shows which numbers consistently scored. Lock those in first and only explore in remaining slots."
- **Gambler**: "Despite your career data, trust your instinct. Use the patterns section to find surprising combinations, not the obvious ones."
- **Analyst**: "Your career data is your primary asset. Cross-reference your cumulative confidence with the game-by-game patterns. Look for numbers that appear in secrets more often than random chance."

---

## Files to Create

### Backend

#### `Domain/Entities/TrainingSession.cs`
```
TrainingSession entity — stores completed game sessions
```

#### `Domain/Entities/ExpertCareer.cs`
```
ExpertCareer entity — stores expert career stats with navigation to ExpertLottoStats
```

#### `Domain/Entities/ExpertLottoStats.cs`
```
ExpertLottoStats entity — per-lotto-game stats including ConfidenceMapJson
```

#### `Domain/Interfaces/ITrainingSessionRepository.cs`
```
GetByUserPagedAsync, AddAsync
```

#### `Domain/Interfaces/IExpertCareerRepository.cs`
```
GetByUserAsync, GetByNameAndPersonalityAsync, UpsertAsync, UpsertStatsAsync
```

#### `Infrastructure/Persistence/Configurations/TrainingSessionConfiguration.cs`
```
Fluent API config for TrainingSession
```

#### `Infrastructure/Persistence/Configurations/ExpertCareerConfiguration.cs`
```
Fluent API config for ExpertCareer + ExpertLottoStats
```

#### `Infrastructure/Persistence/Repositories/TrainingSessionRepository.cs`
#### `Infrastructure/Persistence/Repositories/ExpertCareerRepository.cs`

#### `Api/Endpoints/TrainingEndpoints.cs`
```
POST /api/training/sessions          — save a completed game session
GET  /api/training/sessions          — paginated history for current user
GET  /api/training/careers            — get all expert careers for current user
POST /api/training/careers/sync       — bulk upsert careers from localStorage
GET  /api/training/careers/{name}/{personality}/stats — get specific career
```

### Frontend

#### `features/ai-training/types/expert-registry.ts`
```
ExpertCareer, ExpertLottoStats, ExpertRegistry types (frontend mirrors of backend)
```

#### `features/ai-training/hooks/useExpertRegistry.ts`
```
- load/save registry from localStorage
- syncWithServer() — push localStorage careers to API, pull newer ones back
- updateAfterGame(gameState, lottoGame) — update localStorage + fire API call
- getCareer(name, personality): ExpertCareer | null
- buildSeededConfidenceMap(career, lottoGame, settings): Record<number, number>
```

#### `features/ai-training/api/training-api.ts`
```
API client functions for training endpoints (TanStack Query mutations + queries)
```

---

## Files to Modify

### Backend

#### `Infrastructure/Persistence/AppDbContext.cs`
- Add `DbSet<TrainingSession>`, `DbSet<ExpertCareer>`, `DbSet<ExpertLottoStats>`

#### `Infrastructure/DependencyInjection.cs`
- Register new repositories

#### `Api/Program.cs` (or endpoint registration)
- Map new `TrainingEndpoints`

#### `Hubs/GameHub.cs` — `ExecuteExpertTurn`
- Add optional `careerContextJson` parameter (JSON string with career summary, cumulative knowledge, game memories, patterns)
- If provided and non-empty, **prepend** career context block before the personality prompt so the AI reads its history first
- The frontend builds the career context string from `ExpertLottoStats` (game memories, confidence map, patterns)

#### `Hubs/GameHub.cs` — `GeneratePostGameLesson` (new method)
- Called once per expert after a game ends (AI mode only)
- Sends the expert's game results to Claude with a "summarize what you learned" prompt
- Returns a one-line lesson string to be stored in `GameMemory.lesson`
- For simulation mode, auto-generate the lesson from data (e.g., "Top confidence numbers: 14, 28, 35. Eliminated at round 4.")

### Frontend

#### `features/ai-training/types/game.ts`
- Add `useVeterans: boolean` to `GameSettings`

#### `features/ai-training/components/game/GameSetupModal.tsx`
- Add "Use veteran experts" toggle in Game Parameters card
- Show veteran count badge when toggled on

#### `features/ai-training/hooks/useGameEngine.ts`
- `createManagers()` accepts optional `ExpertRegistry`
- If `useVeterans && registry`, seed each expert's `confidenceMap` from `buildSeededConfidenceMap()`
- Falls back to zero-map if no career record exists for that expert+lottoGame

#### `features/ai-training/hooks/useAiGameEngine.ts`
- Same `createManagers()` seeding change
- `executeAiExpertTurn()` — inject career context into the prompt when `useVeterans` and `gamesPlayed > 0`
- Pass career data through to `GameHub.cs` as an optional extra param in the SignalR call

#### `features/ai-training/hooks/useGameHistory.ts`
- After saving to localStorage, also call `POST /api/training/sessions` to persist to DB
- On load, background-sync with API to merge any server-side history
- Add `downloadGameLog(entry)` and `downloadWinnerProfile(entry)` helper functions

#### `features/ai-training/pages/AiTrainingPage.tsx`
- Load registry via `useExpertRegistry()`
- Pass registry to `NumberTrainingGame`
- After `onGameEnd`: call `updateAfterGame()` to persist career stats (localStorage + API)
- Trigger background sync on mount

#### `features/ai-training/components/game/GameParamsSummary.tsx`
- Show "Veterans" badge if `useVeterans` is true

#### `features/ai-training/components/game/ResultsScreen.tsx` (or equivalent)
- Add "Download Winner Profile" button (JSON export)
- Add "Download Full Game Log" button
- Add winner journey visualization (round-by-round score chart)
- Add confidence map heatmap for the winning expert

#### `features/ai-training/components/game/GameHistoryGrid.tsx`
- Add download buttons per history entry
- Add "Roster" tab showing expert career leaderboard
- Show sync status indicator (synced with server / local only)

---

## EF Core Migration

```bash
dotnet ef migrations add AddTrainingEntities --project src/JesLuckyPick.Infrastructure --startup-project src/JesLuckyPick.Api
dotnet ef database update --project src/JesLuckyPick.Infrastructure --startup-project src/JesLuckyPick.Api
```

---

## Verification

1. **TypeScript**: `npx tsc --noEmit` — zero errors
2. **Frontend tests**: `npx vitest run` — all pass
3. **Backend tests**: `dotnet test` — all pass
4. **Manual — Simulation**:
   - Run 3+ games with veteran toggle OFF → confirm careers are written to localStorage AND database
   - Run a game with veteran toggle ON → open DevTools, confirm experts start with non-zero confidenceMap
   - Confirm stats (gamesPlayed, wins) accumulate correctly after each game
   - Click "Download Winner Profile" → verify valid JSON with confidenceMap and fullHistory
   - Click "Download Full Game Log" → verify complete game log JSON
5. **Manual — AI Agent**:
   - Run 1 game to seed career data
   - Run a second game with veterans ON → check activity log; AI output should reference career context numbers
6. **Manual — Hybrid sync**:
   - Clear localStorage → reload page → verify data is restored from database
   - Play a game → check both localStorage and database have matching records
   - Verify leaderboard / roster reflects cumulative career data from the database
