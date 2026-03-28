# Plan: Persistent Expert Learning Across Games

## Context

Currently, experts are born and die within a single game. The only cross-game reuse is a manual winner-profile import (one expert, one game at a time). The user wants experts to accumulate experience over many games — win/loss records, learned number preferences — so that future games benefit from a growing pool of veterans, not always starting from zero.

---

## Core Insight

The `confidenceMap` is the learning state of an expert. It already updates every try within a game. The natural extension is to **persist and accumulate it across games** — a veteran expert starts with non-zero beliefs because past games taught it which numbers tend to score.

The design separates into two concerns:
1. **Expert Registry** — a persistent store of expert "personas" with career stats + accumulated confidence
2. **Game Integration** — how the registry feeds into new games and gets updated after they end

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
The AI (Claude) doesn't read `confidenceMap` directly — it reads the system prompt. Career data needs to be **injected as prompt context**:

```
[CAREER CONTEXT — inject only if gamesPlayed > 0]
You have played {gamesPlayed} games with a {winRate}% win rate.
Your historically reliable numbers (high cumulative confidence): {top10Numbers}
Numbers that have historically underperformed: {bottom10Numbers}
Your best ever score: {bestEverScore}★ in round {bestRound}
```

This lets Claude reason about what numbers to trust or avoid, going far beyond what the simulation strategies can do — the AI can weigh historical data contextually rather than mechanically.

---

## Storage Design

**Key**: `"jes-expert-registry"` in localStorage (separate from game history)
**Size**: Expert profiles are small (~2KB each). With 24 named experts × personality variants = manageable.

```
ExpertRegistry {
  version: 1,
  experts: ExpertCareer[]   // up to 24 named experts × 4 personalities = 96 max
}
```

In practice, the roster is small (24 names in the current pool). We track the combination of (name + personality) as the stable identity.

---

## Game Flow Changes

### Before a game (Setup Modal)
- New toggle: **"Use veteran experts"** (off = current fresh-start behavior, on = seed from registry)
- Shows a small summary: "12 veterans available, avg {X} games played"
- When enabled: experts are initialized with their cumulative confidenceMap (if they have a record for this lotto game)
- New experts (names not yet in registry) start at zero as before

### During game
No changes — the game loop is unchanged. The accumulated confidence simply gives veterans a warmer start.

### After a game (onGameEnd)
Update the registry for every expert that participated:
- Increment `gamesPlayed`
- Increment `wins` or `eliminations` as appropriate
- Update `avgRoundScore` (rolling average)
- Update `bestEverScore` if beaten
- Merge their end-of-game `confidenceMap` into `cumulativeConfidenceMap` using the decay formula
- For AI Agent mode: same stats update — the cumulative map still tracks which numbers the AI landed on in high-scoring tries

---

## Files to Create

### `types/expert-registry.ts`
```
ExpertCareer, ExpertLottoStats, ExpertRegistry types
```

### `hooks/useExpertRegistry.ts`
```
load/save registry from localStorage
updateAfterGame(gameState: GameState, lottoGame: LottoGameType) — called in onGameEnd
getCareer(name, personality): ExpertCareer | null
buildSeededConfidenceMap(career, lottoGame, settings): Record<number, number>
```

---

## Files to Modify

### `types/game.ts`
- Add `useVeterans: boolean` to `GameSettings`

### `components/game/GameSetupModal.tsx`
- Add "Use veteran experts" toggle in Game Parameters card
- Show veteran count badge when toggled on

### `hooks/useGameEngine.ts`
- `createManagers()` accepts optional `ExpertRegistry`
- If `useVeterans && registry`, seed each expert's `confidenceMap` from `buildSeededConfidenceMap()`
- Falls back to zero-map if no career record exists for that expert+lottoGame

### `hooks/useAiGameEngine.ts`
- Same `createManagers()` seeding change
- `executeAiExpertTurn()` — inject career context into the prompt when `useVeterans` and `gamesPlayed > 0`
- Pass career data through to `GameHub.cs` as an optional extra param in the SignalR call

### `pages/AiTrainingPage.tsx`
- Load registry via `useExpertRegistry()`
- Pass registry to `NumberTrainingGame`
- After `onGameEnd`: call `updateAfterGame()` to persist career stats

### `components/game/GameParamsSummary.tsx`
- Show "Veterans" badge if `useVeterans` is true

### `components/game/GameHistoryGrid.tsx` (optional, later)
- Could add a "Roster" tab showing the expert career leaderboard

---

## Backend Change (AI Agent mode only)

### `GameHub.cs` — `ExecuteExpertTurn`
- Add optional `careerContextJson` parameter
- If provided and non-empty, append career context block to the filled prompt before calling Claude

---

## Verification

1. **TypeScript**: `npx tsc --noEmit` — zero errors
2. **Frontend tests**: `npx vitest run` — all pass
3. **Manual — Simulation**:
   - Run 3+ games with veteran toggle OFF → confirm careers are being written to localStorage
   - Run a game with veteran toggle ON → open DevTools, confirm experts start with non-zero confidenceMap
   - Confirm stats (gamesPlayed, wins) accumulate correctly after each game
4. **Manual — AI Agent**:
   - Run 1 game to seed career data
   - Run a second game with veterans ON → check activity log; AI error output should include career context numbers
