# Number Training Game — Comprehensive Build Plan

## Overview

Build an AI-powered number training game as a **React artifact (.jsx)** where multiple AI participants compete to guess secret number combinations. The game is fully autonomous — the user configures parameters, hits start, and watches AI agents train, learn, compete, and get eliminated in real time.

---

## Architecture

### Hierarchy

```
Training Session (configured by the user)
├── Manager A
│   ├── Expert A1
│   ├── Expert A2
│   └── Expert A3
├── Manager B
│   ├── Expert B1
│   ├── Expert B2
│   ├── Expert B3
│   └── Expert B4
└── Manager C
    ├── Expert C1
    └── Expert C2
```

- **User**: configures parameters and starts the session. Observes the game. Can set the secret combinations or let the system auto-generate them.
- **Manager**: each Manager holds its own secret 6-number combination and oversees its own team of Experts.
- **Expert**: an AI agent that tries to guess its Manager's secret combination. Learns from its own history.

---

## Configurable Parameters (UI Setup Screen)

| Parameter | Description | Default |
|-----------|-------------|---------|
| Number Range Min | Lowest number in the pool | 1 |
| Number Range Max | Highest number in the pool | 45 |
| Combination Size | How many numbers in each combination | 6 |
| Number of Managers | How many independent Manager teams | 3 |
| Experts per Manager | How many Expert agents each Manager spawns | 4 |
| Time Limit (minutes) | Max duration before forced stop | 5 |
| Simulation Speed (ms) | Delay between each try for visual readability | 500 |

---

## Game Rules

### Roles

**Manager**
- Each Manager is assigned a unique, randomly generated secret combination of 6 numbers (no duplicates) from the number range.
- Each Manager spawns N Expert agents.
- The Manager evaluates its Experts each round and eliminates underperformers.

**Expert**
- Each Expert belongs to one Manager and tries to guess that Manager's secret combination.
- Each round, the Expert gets 6 tries.
- Each try: the Expert submits a combination of 6 unique numbers.
- Scoring: 1 star per correct number (number exists in the Manager's secret combo, position doesn't matter).
- Stars reset to 0 on every new try. There is NO accumulation.
- The Expert's best single-try score in a round is its "round score."

### Round Flow (per Manager)

1. Each surviving Expert gets 6 tries.
2. Each try: Expert submits 6 numbers → receives star count → stars reset.
3. Expert's best single-try score = round score.
4. Elimination: any Expert with a round score < 2 stars is eliminated from the game permanently.
5. Check win condition: if any Expert scored 5 stars in a single try, that Expert wins and that Manager wins.
6. If all of a Manager's Experts are eliminated, that Manager is marked as "failed."
7. Proceed to next round.

### Game End Conditions (the ENTIRE session stops when ANY of these occur)

1. **Winner found**: an Expert scores 5 or more stars in a single try. That Expert is the winning Expert, and its Manager is the winning Manager. There are exactly 2 winners: 1 Manager + 1 Expert.
2. **Total elimination**: ALL Experts across ALL Managers are eliminated. Game over, no winner.
3. **Time limit reached**: the configured time runs out. Game over (if no winner yet).

---

## Expert Guessing Strategy (AI Logic)

Let the AI decide its own optimal strategy. Each Expert should have autonomous decision-making. Here are the building blocks to implement:

### Per-Expert State

Each Expert maintains:
- `confidenceMap`: an object mapping every number in the range to a confidence score (starts at 0).
- `tryHistory`: array of all past tries across all rounds — each entry contains `{ guess: [numbers], stars: number, round: number, try: number }`.
- `roundHistory`: array of tries within the current round only (resets each round).
- `personality`: a random personality type assigned at creation that influences behavior.

### Personality Types (assigned randomly at Expert creation)

- **Scanner**: prioritizes maximum coverage — tries to test as many unique numbers as possible across its 6 tries within a round.
- **Sticky**: locks in any number that appeared in a high-scoring try and only swaps the remaining slots.
- **Gambler**: makes large random swaps between tries, hoping for a lucky breakthrough.
- **Analyst**: divides the number range into sections and methodically tests each section.

### Learning Logic (applied automatically)

- After each try, the Expert updates its `confidenceMap`:
  - If a try scored high (3+ stars), increase confidence for all numbers in that try.
  - If a try scored 0 stars, decrease confidence for all numbers in that try.
  - Numbers that appear in multiple high-scoring tries get the highest confidence.
- Within a round (tries 1–6), the Expert should use early tries to explore and later tries to exploit:
  - Tries 1–2: broader exploration, influenced by personality.
  - Tries 3–4: refine based on what scored in tries 1–2.
  - Tries 5–6: go for the best possible combination using all data from this round.
- Across rounds, the Expert starts each new round's Try 1 with its top-confidence numbers, not from scratch.

### Important

- All 6 numbers in a guess must be unique (no duplicates).
- Numbers must be within the configured range.
- Each personality type should produce visibly different behavior — this is what makes the game interesting to watch.

---

## Data Capture & Winner Export

### Full Game Log Structure

Throughout the game, maintain a complete log:

```
gameLog = {
  settings: { min, max, combinationSize, managerCount, expertsPerManager, timeLimit },
  startTime: timestamp,
  endTime: timestamp,
  result: "winner_found" | "all_eliminated" | "time_up",
  winner: {
    manager: { id, secretCombination },
    expert: { id, name, personality, finalConfidenceMap, totalRounds, totalTries }
  } | null,
  managers: [
    {
      id,
      secretCombination,
      status: "winner" | "failed" | "active",
      experts: [
        {
          id,
          name,
          personality,
          status: "winner" | "eliminated" | "active",
          eliminatedAtRound: number | null,
          confidenceMap: { ... },
          roundScores: [number],
          fullHistory: [
            { round, try, guess: [numbers], stars, bestInRound: boolean }
          ]
        }
      ]
    }
  ]
}
```

### Winner Data Export

When the game ends, if there's a winner:
- Display a summary card showing the winning Manager and Expert.
- Show the winning Expert's full journey: round-by-round improvement, key turning points, final confidence map.
- Provide a **"Download Winner Profile" button** that exports a JSON file containing:
  - The winning Expert's `confidenceMap` (the learned number preferences).
  - The winning Expert's `personality` type.
  - The winning Expert's `fullHistory` (every try it ever made).
  - The Manager's secret combination.
  - Game settings used.

### Reusability

- The exported JSON profile can be **imported** in a future session to seed a new Expert with the winner's learned knowledge. Include an "Import Profile" option on the setup screen.
- When imported, the new Expert starts with the winner's `confidenceMap` instead of all zeros, giving it a head start.

---

## UI Design

### Aesthetic Direction

- **Theme**: dark, terminal/console aesthetic — think mission control monitoring AI agents.
- **Font**: monospace for numbers and data, clean sans-serif for labels.
- **Colors**: dark background (#0a0a12), amber/gold (#f5a623) for stars and highlights, cyan (#00d4ff) for active states, red (#ff4757) for eliminations, green (#2ed573) for winners.
- **Animation**: smooth transitions for eliminations (fade out), star awards (pop-in), and round transitions.

### Screen Flow

1. **Setup Screen**: configure all parameters, optional import of a winner profile. Big "Start Training" button.
2. **Live Game Screen**: the main view during the simulation. Shows:
   - Timer countdown in the top bar.
   - Grid of Manager cards, each showing:
     - Manager's ID and status.
     - Its Experts listed with: name, personality badge, current round score, star display, alive/eliminated status.
     - Current round and try number.
   - A live activity log at the bottom showing events ("Expert A2 scored 3 stars", "Expert B1 eliminated", etc.).
3. **Results Screen**: appears when the game ends. Shows:
   - Outcome banner (Winner Found / All Eliminated / Time Up).
   - If winner: winning Manager card + winning Expert card with full stats.
   - Leaderboard of all Experts ranked by their best-ever single-try score.
   - "Download Winner Profile" button (JSON export).
   - "Play Again" and "Import Profile & Play" buttons.

### Live Game Layout

```
┌─────────────────────────────────────────────────┐
│  ROUND 4  |  TRY 3/6  |  ⏱ 2:34 remaining      │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌─ MANAGER A ──────┐  ┌─ MANAGER B ──────┐     │
│  │ Secret: ●●●●●●   │  │ Secret: ●●●●●●   │     │
│  │                   │  │                   │     │
│  │ Expert A1 [Scan]  │  │ Expert B1 [Gamb]  │     │
│  │ ★★★☆☆☆  Round: 3 │  │ ★☆☆☆☆☆  Round: 1 │     │
│  │                   │  │                   │     │
│  │ Expert A2 [Stick] │  │ Expert B2 [Anal]  │     │
│  │ ★★☆☆☆☆  Round: 2 │  │ ☠ Eliminated R2   │     │
│  │                   │  │                   │     │
│  │ Expert A3 [Anal]  │  │ Expert B3 [Scan]  │     │
│  │ ☠ Eliminated R3   │  │ ★★★★☆☆ Round: 4  │     │
│  └───────────────────┘  └───────────────────┘     │
│                                                   │
├─────────────────────────────────────────────────┤
│  LOG:                                             │
│  > Expert B3 scored 4★ on try 2 (best so far!)   │
│  > Expert A3 eliminated (round score: 1★)         │
│  > Round 4 started                                │
└─────────────────────────────────────────────────┘
```

---

## Technical Notes

- Build as a single **React (.jsx) artifact** — all code in one file.
- Use `useState`, `useEffect`, `useRef`, `useCallback` from React.
- Use `setInterval` or `setTimeout` for simulation ticking (controlled by the speed parameter).
- Use Tailwind utility classes for styling.
- No external dependencies beyond what's available in the Claude artifact environment (React, Tailwind, lucide-react for icons).
- The game should be **fully autonomous** after pressing Start — no user interaction needed during the simulation.
- Include a **Pause/Resume** button during the simulation.
- The secret combinations should be hidden during the game (shown as ●●●●●●) and revealed on the Results screen.
- Store the full game log in React state. On game end, serialize it as JSON for the download export.

---

## Summary

This is a fully AI-driven number training game. The user sets up parameters, launches the session, and watches multiple Managers and their Expert agents compete autonomously. Each Expert has a personality and learns from its history. The game produces exactly 2 winners (1 Manager + 1 Expert) or ends in failure. The winning Expert's learned profile can be exported and reused in future sessions. Build it as a polished, dark-themed React artifact with real-time visualization of the competition.
