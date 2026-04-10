import { useCallback, useEffect } from "react";
import type {
  ExpertCareer,
  ExpertLottoStats,
  GameMemory,
  CareerSummary,
} from "../types/expert-registry";
import type {
  GameState,
  LottoGameType,
  GameSettings,
  Expert,
  Manager,
} from "../types/game";
import { useExpertRegistryStore } from "@/stores/expertRegistryStore";

const MAX_MEMORIES = 20;
const DECAY_FACTOR = 0.7;
const LEARNING_RATE = 0.3;

// ── Accumulation helpers ──

function mergeConfidenceMaps(
  cumulative: Record<number, number>,
  gameResult: Record<number, number>
): Record<number, number> {
  const merged: Record<number, number> = {};
  const allKeys = new Set([
    ...Object.keys(cumulative),
    ...Object.keys(gameResult),
  ]);
  for (const key of allKeys) {
    const k = Number(key);
    const oldVal = cumulative[k] ?? 0;
    const newVal = gameResult[k] ?? 0;
    merged[k] = oldVal * DECAY_FACTOR + newVal * LEARNING_RATE;
  }
  return merged;
}

function getTopN(map: Record<number, number>, n: number): number[] {
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([k]) => Number(k));
}

function getBottomN(map: Record<number, number>, n: number): number[] {
  return Object.entries(map)
    .sort(([, a], [, b]) => a - b)
    .slice(0, n)
    .map(([k]) => Number(k));
}

function buildGameMemory(
  expert: Expert,
  manager: Manager,
  gameId: string,
  result: string,
  mode?: "simulation" | "ai-agent" | "scheduled"
): GameMemory {
  const bestTry = expert.tryHistory.reduce(
    (best, t) => (t.stars > best.stars ? t : best),
    expert.tryHistory[0] ?? { guess: [], stars: 0 }
  );

  const matchedNumbers = bestTry.guess.filter((n) =>
    manager.secretCombination.includes(n)
  );

  const topConfidence = getTopN(expert.confidenceMap, 5);
  const bottomConfidence = getBottomN(expert.confidenceMap, 5);

  const lesson =
    matchedNumbers.length > 0
      ? `Matched ${matchedNumbers.join(", ")} in best try (${bestTry.stars}★). Top confidence: ${topConfidence.slice(0, 3).join(", ")}.`
      : `No matches in best try. Top confidence numbers ${topConfidence.slice(0, 3).join(", ")} need re-evaluation.`;

  return {
    gameId,
    playedAt: new Date().toISOString(),
    result,
    roundsPlayed: expert.roundScores.length,
    bestScore: bestTry.stars,
    bestGuess: bestTry.guess,
    secretCombo: manager.secretCombination,
    matchedNumbers,
    topConfidence,
    bottomConfidence,
    lesson,
    ...(mode !== undefined ? { mode } : {}),
  };
}

function buildCareerSummary(
  overflowMemories: GameMemory[]
): CareerSummary {
  const totalGames = overflowMemories.length;
  const totalWins = overflowMemories.filter((m) => m.result === "won").length;
  const totalEliminations = overflowMemories.filter((m) =>
    m.result.startsWith("eliminated")
  ).length;

  const secretCounts: Record<number, number> = {};
  const guessCounts: Record<number, number> = {};
  for (const m of overflowMemories) {
    for (const n of m.secretCombo) secretCounts[n] = (secretCounts[n] ?? 0) + 1;
    for (const n of m.bestGuess) guessCounts[n] = (guessCounts[n] ?? 0) + 1;
  }

  const recurringSecretNumbers = Object.entries(secretCounts)
    .filter(([, c]) => c >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([k]) => Number(k));

  const recurringBestGuessNumbers = Object.entries(guessCounts)
    .filter(([, c]) => c >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([k]) => Number(k));

  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const trend = `${totalGames} games, ${winRate}% win rate. ${
    totalWins > 0
      ? `Won ${totalWins} times.`
      : "No wins yet."
  }`;

  return {
    totalGames,
    totalWins,
    totalEliminations,
    recurringSecretNumbers,
    recurringBestGuessNumbers,
    trend,
  };
}

// ── Build seeded confidence map for veteran experts ──

export function buildSeededConfidenceMap(
  career: ExpertCareer,
  lottoGame: LottoGameType,
  settings: GameSettings
): Record<number, number> {
  const stats = career.byLottoGame[lottoGame];
  if (!stats) {
    const map: Record<number, number> = {};
    for (let i = settings.numberRangeMin; i <= settings.numberRangeMax; i++) {
      map[i] = 0;
    }
    return map;
  }

  const map: Record<number, number> = {};
  for (let i = settings.numberRangeMin; i <= settings.numberRangeMax; i++) {
    map[i] = stats.confidenceMap[i] ?? 0;
  }

  if (career.gamesPlayed > 0 && career.wins / career.gamesPlayed > 0.3) {
    const topNumbers = getTopN(map, 6);
    for (const n of topNumbers) {
      map[n] *= 1.15;
    }
  }

  return map;
}

// ── Build career context for AI agent mode ──

export function buildCareerContext(
  career: ExpertCareer,
  lottoGame: LottoGameType
): string | null {
  const stats = career.byLottoGame[lottoGame];
  if (!stats || stats.gamesPlayed === 0) return null;

  const winRate =
    career.gamesPlayed > 0
      ? Math.round((career.wins / career.gamesPlayed) * 100)
      : 0;

  const topNumbers = getTopN(stats.confidenceMap, 10)
    .map((n) => `${n}(${stats.confidenceMap[n]?.toFixed(2) ?? "0"})`)
    .join(", ");
  const bottomNumbers = getBottomN(stats.confidenceMap, 10)
    .map((n) => `${n}(${stats.confidenceMap[n]?.toFixed(2) ?? "0"})`)
    .join(", ");

  const allNumbers = Object.entries(stats.confidenceMap);
  const leastTested = allNumbers
    .filter(([, v]) => Math.abs(v) < 0.05)
    .slice(0, 10)
    .map(([k]) => k)
    .join(", ");

  const lines: string[] = [];

  lines.push(`== Career History for ${career.name} (${career.personality} personality) ==`);
  lines.push(
    `You are a veteran expert agent in the Jes Lucky Pick game. You have played ${stats.gamesPlayed} games of ${lottoGame}.`
  );
  lines.push(
    `Win rate: ${career.wins}/${career.gamesPlayed} (${winRate}%). Eliminations: ${career.eliminations}.`
  );
  lines.push(`Best ever score: ${career.bestEverScore}★.`);
  lines.push("");

  lines.push("== Cumulative Knowledge ==");
  lines.push(`Numbers you trust most (high cumulative confidence): ${topNumbers}`);
  lines.push(`Numbers you avoid (low cumulative confidence): ${bottomNumbers}`);
  if (leastTested) {
    lines.push(`Numbers you haven't tested enough: ${leastTested}`);
  }
  lines.push("");

  const memories = stats.gameMemories;
  if (memories.length > 0) {
    const tier1 = memories.slice(-5);
    const tier2 = memories.slice(0, Math.max(0, memories.length - 5));

    lines.push(`== Game-by-Game Memory (${memories.length} games on record) ==`);

    if (tier2.length > 0) {
      const t2Wins = tier2.filter((m) => m.result === "won").length;
      const t2Elims = tier2.filter((m) => m.result.startsWith("eliminated")).length;
      const t2Survived = tier2.length - t2Wins - t2Elims;
      const t2AvgScore =
        tier2.reduce((s, m) => s + m.bestScore, 0) / tier2.length;

      const t2SecretCounts: Record<number, number> = {};
      for (const m of tier2) {
        for (const n of m.secretCombo)
          t2SecretCounts[n] = (t2SecretCounts[n] ?? 0) + 1;
      }
      const t2Recurring = Object.entries(t2SecretCounts)
        .filter(([, c]) => c >= 2)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([k]) => k);

      const keyLessons = tier2
        .filter((m) => m.bestScore >= 3 || m.result === "won")
        .slice(-3)
        .map((m) => `"${m.lesson}"`);

      lines.push(
        `Earlier games (${tier2.length} games): ${t2Wins} wins, ${t2Elims} eliminations, ${t2Survived} survived.`
      );
      lines.push(`  Avg best score: ${t2AvgScore.toFixed(1)}★.`);
      if (t2Recurring.length > 0) {
        lines.push(`  Recurring in secrets: [${t2Recurring.join(", ")}].`);
      }
      if (keyLessons.length > 0) {
        lines.push(`  Key lessons: ${keyLessons.join("; ")}`);
      }
      lines.push("");
    }

    for (const m of tier1) {
      lines.push(
        `Game (${m.playedAt.slice(0, 10)}): ${m.result}. Best: ${m.bestScore}★ with [${m.bestGuess.join(", ")}].`
      );
      lines.push(
        `  Secret was [${m.secretCombo.join(", ")}]. You matched: [${m.matchedNumbers.join(", ")}].`
      );
      lines.push(`  Lesson: "${m.lesson}"`);
    }
    lines.push("");
  }

  if (stats.careerSummary) {
    const cs = stats.careerSummary;
    lines.push(
      `== Early Career Summary (${cs.totalGames} older games not shown in detail) ==`
    );
    lines.push(cs.trend);
    if (cs.recurringSecretNumbers.length > 0) {
      lines.push(
        `  Numbers recurring in secrets: [${cs.recurringSecretNumbers.join(", ")}]`
      );
    }
    lines.push("");
  }

  const allMemories = stats.gameMemories;
  if (allMemories.length >= 3) {
    const secretCounts: Record<number, number> = {};
    const guessCounts: Record<number, number> = {};
    for (const m of allMemories) {
      for (const n of m.secretCombo)
        secretCounts[n] = (secretCounts[n] ?? 0) + 1;
      for (const n of m.bestGuess)
        guessCounts[n] = (guessCounts[n] ?? 0) + 1;
    }

    const recurringSecrets = Object.entries(secretCounts)
      .filter(([, c]) => c >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    const recurringGuesses = Object.entries(guessCounts)
      .filter(([, c]) => c >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const lastResults = allMemories
      .slice(-5)
      .map((m) => (m.result === "won" ? "W" : m.result.startsWith("eliminated") ? "E" : "S"))
      .join(", ");

    lines.push("== Patterns to Notice ==");
    if (recurringSecrets.length > 0) {
      lines.push(
        `- Numbers in multiple secrets: ${recurringSecrets.map(([k, c]) => `${k}(${c}x)`).join(", ")}`
      );
    }
    if (recurringGuesses.length > 0) {
      lines.push(
        `- Numbers in your best guesses: ${recurringGuesses.map(([k, c]) => `${k}(${c}x)`).join(", ")}`
      );
    }
    lines.push(`- Recent trend: ${lastResults}`);
    lines.push("");
  }

  lines.push("== Instructions ==");
  lines.push(
    "Use your career history to inform your strategy. You are not starting from zero — you have experience. " +
      "Lean on numbers you've seen succeed, but don't ignore new possibilities. " +
      `Your personality is ${career.personality}, so apply your approach to this accumulated knowledge.`
  );

  return lines.join("\n");
}

// ── Hook ──

export function useExpertRegistry() {
  const {
    registry,
    setRegistry,
    loadFromServer,
    syncToServer,
    updateCareer,
    deleteCareer,
  } = useExpertRegistryStore();

  // Load from DB on mount (only once across all consumers)
  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  const getCareer = useCallback(
    (name: string, personality: string): ExpertCareer | null => {
      return (
        registry.experts.find(
          (e) => e.name === name && e.personality === personality
        ) ?? null
      );
    },
    [registry]
  );

  const getVeteranCount = useCallback(
    (lottoGame: LottoGameType): number => {
      return registry.experts.filter(
        (e) => e.byLottoGame[lottoGame]?.gamesPlayed > 0
      ).length;
    },
    [registry]
  );

  const updateAfterGame = useCallback(
    (gameState: GameState, lottoGame: LottoGameType, mode?: "simulation" | "ai-agent" | "scheduled") => {
      const prev = useExpertRegistryStore.getState().registry;
      const updated = { ...prev, experts: [...prev.experts] };
      const gameId = crypto.randomUUID();
      const now = new Date().toISOString();

      for (const manager of gameState.managers) {
        for (const expert of manager.experts) {
          let careerIdx = updated.experts.findIndex(
            (c) => c.name === expert.name && c.personality === expert.personality
          );

          if (careerIdx === -1) {
            updated.experts.push({
              id: crypto.randomUUID(),
              name: expert.name,
              personality: expert.personality,
              gamesPlayed: 0,
              wins: 0,
              eliminations: 0,
              totalRoundsPlayed: 0,
              bestEverScore: 0,
              avgRoundScore: 0,
              lastPlayedAt: null,
              byLottoGame: {},
            });
            careerIdx = updated.experts.length - 1;
          }

          const career = { ...updated.experts[careerIdx] };
          updated.experts[careerIdx] = career;

          career.gamesPlayed += 1;
          if (expert.status === "winner") career.wins += 1;
          if (expert.status === "eliminated") career.eliminations += 1;

          const roundsThisGame = expert.roundScores.length;
          career.totalRoundsPlayed += roundsThisGame;
          career.lastPlayedAt = now;

          const bestThisGame = expert.tryHistory.reduce(
            (max, t) => Math.max(max, t.stars),
            0
          );
          if (bestThisGame > career.bestEverScore) {
            career.bestEverScore = bestThisGame;
          }

          if (roundsThisGame > 0) {
            const avgThisGame =
              expert.roundScores.reduce((s, r) => s + r, 0) / roundsThisGame;
            const totalRounds = career.totalRoundsPlayed;
            career.avgRoundScore =
              totalRounds > 0
                ? (career.avgRoundScore * (totalRounds - roundsThisGame) +
                    avgThisGame * roundsThisGame) /
                  totalRounds
                : avgThisGame;
          }

          career.byLottoGame = { ...career.byLottoGame };
          const existingStats = career.byLottoGame[lottoGame];

          const stats: ExpertLottoStats = existingStats
            ? { ...existingStats }
            : {
                lottoGameCode: lottoGame,
                gamesPlayed: 0,
                wins: 0,
                eliminations: 0,
                confidenceMap: {},
                gameMemories: [],
                careerSummary: null,
              };

          stats.gamesPlayed += 1;
          if (expert.status === "winner") stats.wins += 1;
          if (expert.status === "eliminated") stats.eliminations += 1;

          stats.confidenceMap = mergeConfidenceMaps(
            stats.confidenceMap,
            expert.confidenceMap
          );

          let resultStr = "survived_time_up";
          if (expert.status === "winner") resultStr = "won";
          else if (expert.status === "eliminated")
            resultStr = `eliminated_round_${expert.eliminatedAtRound}`;

          const memory = buildGameMemory(expert, manager, gameId, resultStr, mode);
          stats.gameMemories = [...stats.gameMemories, memory];

          if (stats.gameMemories.length > MAX_MEMORIES) {
            const overflow = stats.gameMemories.slice(
              0,
              stats.gameMemories.length - MAX_MEMORIES
            );
            stats.gameMemories = stats.gameMemories.slice(-MAX_MEMORIES);

            const existingSummaryMemories = stats.careerSummary
              ? Array(stats.careerSummary.totalGames).fill(null)
              : [];
            stats.careerSummary = buildCareerSummary([
              ...existingSummaryMemories.map(
                () =>
                  ({
                    secretCombo: stats.careerSummary?.recurringSecretNumbers ?? [],
                    bestGuess: stats.careerSummary?.recurringBestGuessNumbers ?? [],
                    result: "unknown",
                  }) as unknown as GameMemory
              ),
              ...overflow,
            ]);
            stats.careerSummary.totalGames =
              (existingStats?.careerSummary?.totalGames ?? 0) + overflow.length;
          }

          career.byLottoGame[lottoGame] = stats;
        }
      }

      // Update store and persist to DB
      setRegistry(updated);
      syncToServer(updated.experts);
    },
    [setRegistry, syncToServer]
  );

  const getCareerById = useCallback(
    (id: string): ExpertCareer | null =>
      registry.experts.find((e) => e.id === id) ?? null,
    [registry]
  );

  const deduplicateRegistry = useCallback((): { fixed: number; names: string[] } => {
    const experts = registry.experts;

    // Pass 1: deduplicate by ID — keep first occurrence
    const seenIds = new Set<string>();
    const deduped = experts.filter((e) => {
      if (seenIds.has(e.id)) return false;
      seenIds.add(e.id);
      return true;
    });
    const idFixed = experts.length - deduped.length;

    // Pass 2: deduplicate by name — rename duplicates
    const nameCounts = new Map<string, ExpertCareer[]>();
    for (const expert of deduped) {
      const key = expert.name.toLowerCase();
      const group = nameCounts.get(key) ?? [];
      group.push(expert);
      nameCounts.set(key, group);
    }

    const fixed: string[] = [];
    const updatedExperts = [...deduped];
    if (idFixed > 0) fixed.push(`${idFixed} duplicate ID(s) removed`);

    for (const [, group] of nameCounts) {
      if (group.length <= 1) continue;

      const sorted = [...group].sort(
        (a, b) =>
          (b.byLottoGame["6/42"]?.gamesPlayed ?? 0) -
          (a.byLottoGame["6/42"]?.gamesPlayed ?? 0)
      );

      for (let i = 1; i < sorted.length; i++) {
        const career = sorted[i];
        const baseName = career.name;
        let suffix = i + 1;
        let newName = `${baseName}-${suffix}`;

        while (
          updatedExperts.some(
            (e) =>
              e.id !== career.id && e.name.toLowerCase() === newName.toLowerCase()
          )
        ) {
          suffix++;
          newName = `${baseName}-${suffix}`;
        }

        const idx = updatedExperts.findIndex((e) => e.id === career.id);
        if (idx !== -1) {
          updatedExperts[idx] = { ...updatedExperts[idx], name: newName };
          fixed.push(`${baseName} (${career.personality}) → ${newName}`);
          updateCareer(career.id, { name: newName });
        }
      }
    }

    if (fixed.length > 0 || idFixed > 0) {
      setRegistry({ version: 1, experts: updatedExperts });
    }

    return { fixed: fixed.length + (idFixed > 0 ? 1 : 0), names: fixed };
  }, [registry, setRegistry, updateCareer]);

  return {
    registry,
    getCareer,
    getCareerById,
    getVeteranCount,
    updateAfterGame,
    updateCareer,
    deleteCareer,
    deduplicateRegistry,
  };
}
