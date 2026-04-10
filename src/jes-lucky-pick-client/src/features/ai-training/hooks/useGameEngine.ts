import { useState, useRef, useCallback, useEffect } from "react";
import type {
  GameState,
  GameSettings,
  GameEngine,
  Manager,
  Expert,
  ExpertPersonality,
  WinnerProfile,
  ActivityLogEntry,
  TryResult,
  LottoGameType,
} from "../types/game";
import type { ExpertRegistry, ExpertCareer } from "../types/expert-registry";
import { buildSeededConfidenceMap } from "./useExpertRegistry";
import {
  executeStrategy,
  scoreGuess,
  updateConfidenceMap,
  generateSecretCombination,
} from "../utils/strategies";

const PERSONALITIES: ExpertPersonality[] = [
  "Scanner",
  "Sticky",
  "Gambler",
  "Analyst",
];

const EXPERT_NAMES = [
  "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot",
  "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima",
  "Mike", "November", "Oscar", "Papa", "Quebec", "Romeo",
  "Sierra", "Tango", "Uniform", "Victor", "Whiskey", "X-Ray",
];

// Returns the next available name that is not already used in the current game
// and not claimed by a different personality in the registry.
function pickName(
  startIdx: number,
  personality: ExpertPersonality,
  usedInGame: Set<string>,
  registry?: ExpertRegistry
): { name: string; nextIdx: number } {
  let idx = startIdx;
  for (let attempts = 0; attempts < EXPERT_NAMES.length * 20; attempts++) {
    const base = EXPERT_NAMES[idx % EXPERT_NAMES.length];
    const cycle = Math.floor(idx / EXPERT_NAMES.length);
    const candidate = cycle === 0 ? base : `${base}-${cycle + 1}`;
    if (!usedInGame.has(candidate)) {
      const takenByOther = registry?.experts.some(
        (e) => e.name.toLowerCase() === candidate.toLowerCase() && e.personality !== personality
      ) ?? false;
      if (!takenByOther) {
        return { name: candidate, nextIdx: idx + 1 };
      }
    }
    idx++;
  }
  return { name: `Expert-${Date.now() % 10000}`, nextIdx: startIdx + 1 };
}

function createInitialState(settings: GameSettings): GameState {
  return {
    phase: "setup",
    currentRound: 0,
    currentTry: 0,
    currentExpertId: null,
    managers: [],
    timeRemaining: settings.timeLimitMinutes * 60,
    log: [],
    result: null,
    winner: null,
    settings,
  };
}

function initializeConfidenceMap(settings: GameSettings): Record<number, number> {
  const map: Record<number, number> = {};
  for (let n = settings.numberRangeMin; n <= settings.numberRangeMax; n++) {
    map[n] = 0;
  }
  return map;
}

function pickSecretCombination(settings: GameSettings, usedSecrets: Set<string>): number[] {
  const draws = settings.historicalDraws;
  if (draws && draws.length > 0) {
    const shuffled = [...draws].sort(() => Math.random() - 0.5);
    for (const draw of shuffled) {
      const key = [...draw].sort((a, b) => a - b).join(",");
      if (!usedSecrets.has(key)) {
        usedSecrets.add(key);
        return draw;
      }
    }
    return shuffled[Math.floor(Math.random() * shuffled.length)];
  }
  return generateSecretCombination(settings);
}

/**
 * Build a pool of veteran experts grouped by personality, shuffled.
 * When useVeterans is ON, we prioritize reusing these names so that
 * updateAfterGame matches them to existing careers instead of creating new ones.
 */
function buildVeteranPool(
  registry: ExpertRegistry,
  lottoGame: LottoGameType
): Map<string, ExpertCareer[]> {
  const pool = new Map<string, ExpertCareer[]>();
  for (const personality of PERSONALITIES) {
    const matching = registry.experts
      .filter(
        (e) =>
          e.personality === personality &&
          (e.byLottoGame[lottoGame]?.gamesPlayed ?? 0) > 0
      )
      .sort(() => Math.random() - 0.5); // shuffle so we don't always pick the same ones
    pool.set(personality, matching);
  }
  return pool;
}

function createManagers(
  settings: GameSettings,
  importedProfile?: WinnerProfile,
  registry?: ExpertRegistry
): Manager[] {
  const managers: Manager[] = [];
  let nameIdx = Math.floor(Math.random() * EXPERT_NAMES.length);
  const usedInGame = new Set<string>();
  const usedSecrets = new Set<string>();

  // When useVeterans is ON, build a pool of veterans grouped by personality
  const veteranPool =
    settings.useVeterans && registry
      ? buildVeteranPool(registry, settings.lottoGame)
      : null;

  for (let m = 0; m < settings.managerCount; m++) {
    const managerId = `mgr-${m + 1}`;
    const secret = pickSecretCombination(settings, usedSecrets);
    const experts: Expert[] = [];

    for (let e = 0; e < settings.expertsPerManager; e++) {
      const expertId = `${managerId}-exp-${e + 1}`;
      let personality: ExpertPersonality = PERSONALITIES[e % PERSONALITIES.length];

      const useProfile =
        importedProfile && m === 0 && e === 0 && personality === importedProfile.personality;

      // Try to pick a veteran name first, then fall back to generated name
      let name = "";
      let veteranCareer: ExpertCareer | undefined;

      if (!useProfile && veteranPool) {
        const pool = veteranPool.get(personality) ?? [];
        // Pick the first veteran whose name isn't already used in this game
        const vetIdx = pool.findIndex((c) => !usedInGame.has(c.name));
        if (vetIdx !== -1) {
          veteranCareer = pool[vetIdx];
          name = veteranCareer.name;
          pool.splice(vetIdx, 1); // remove so we don't pick the same one again
        } else {
          // Pool for this personality is empty — try other personality pools
          let found = false;
          for (const otherP of PERSONALITIES) {
            if (otherP === personality) continue;
            const otherPool = veteranPool.get(otherP) ?? [];
            const otherIdx = otherPool.findIndex((c) => !usedInGame.has(c.name));
            if (otherIdx !== -1) {
              veteranCareer = otherPool[otherIdx];
              name = veteranCareer.name;
              personality = veteranCareer.personality;
              otherPool.splice(otherIdx, 1);
              found = true;
              break;
            }
          }
          if (!found) {
            const picked = pickName(nameIdx, personality, usedInGame, registry);
            name = picked.name;
            nameIdx = picked.nextIdx;
          }
        }
      } else {
        const picked = pickName(nameIdx, personality, usedInGame, registry);
        name = picked.name;
        nameIdx = picked.nextIdx;
      }

      usedInGame.add(name);

      // Veteran seeding: look up career data if useVeterans is enabled
      let confidenceMap: Record<number, number>;
      if (useProfile) {
        confidenceMap = { ...importedProfile.confidenceMap };
      } else if (settings.useVeterans && registry) {
        const career =
          veteranCareer ??
          registry.experts.find(
            (c) => c.name === name && c.personality === personality
          );
        confidenceMap = career
          ? buildSeededConfidenceMap(career, settings.lottoGame, settings)
          : initializeConfidenceMap(settings);
      } else {
        confidenceMap = initializeConfidenceMap(settings);
      }

      experts.push({
        id: expertId,
        name,
        managerId,
        personality: useProfile ? importedProfile.personality : personality,
        status: "active",
        confidenceMap,
        tryHistory: [],
        roundHistory: [],
        roundScores: [],
        eliminatedAtRound: null,
        currentRoundScore: 0,
      });
    }

    managers.push({
      id: managerId,
      secretCombination: secret,
      status: "active",
      experts,
    });
  }

  return managers;
}

function addLog(
  log: ActivityLogEntry[],
  message: string,
  type: ActivityLogEntry["type"]
): ActivityLogEntry[] {
  return [...log, { timestamp: Date.now(), message, type }];
}

export function useGameEngine(): GameEngine {
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialState({
      lottoGame: "6/42",
      numberRangeMin: 1,
      numberRangeMax: 42,
      combinationSize: 6,
      managerCount: 3,
      expertsPerManager: 4,
      timeLimitMinutes: 5,
      simulationSpeedMs: 500,
      gameMode: "simulation",
      concurrencyMode: "sequential",
      model: "claude-haiku-4-5-20251001",
      useVeterans: false,
    })
  );

  // Web Worker timer — not throttled when the browser tab is hidden
  const workerRef = useRef<Worker | null>(null);

  const getWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("../utils/timer.worker.ts", import.meta.url),
        { type: "module" }
      );
    }
    return workerRef.current;
  }, []);

  const clearIntervals = useCallback(() => {
    workerRef.current?.postMessage({ type: "stop-all" });
  }, []);

  const tick = useCallback(() => {
    setGameState((prev) => {
      if (prev.phase !== "running") return prev;

      const state = structuredClone(prev);
      const { settings } = state;

      // If currentTry > 6, the round is over — do eliminations
      if (state.currentTry > 6) {
        const completedRound = state.currentRound;
        state.log = addLog(state.log, `── Round ${completedRound} complete ──`, "round");

        let anyAlive = false;
        for (const manager of state.managers) {
          if (manager.status !== "active") continue;

          for (const expert of manager.experts) {
            if (expert.status !== "active") continue;

            expert.roundScores.push(expert.currentRoundScore);

            if (expert.currentRoundScore < 2) {
              expert.status = "eliminated";
              expert.eliminatedAtRound = completedRound;
              state.log = addLog(
                state.log,
                `☠ ${expert.name} eliminated (round score: ${expert.currentRoundScore}★)`,
                "elimination"
              );
            }
          }

          const hasActiveExperts = manager.experts.some((e) => e.status === "active");
          if (!hasActiveExperts) {
            manager.status = "failed";
            state.log = addLog(
              state.log,
              `Manager ${manager.id} failed — all experts eliminated`,
              "elimination"
            );
          } else {
            anyAlive = true;
          }

          // Reset round state for surviving experts
          for (const expert of manager.experts) {
            if (expert.status === "active") {
              expert.roundHistory = [];
              expert.currentRoundScore = 0;
            }
          }
        }

        if (!anyAlive) {
          state.phase = "ended";
          state.result = "all_eliminated";
          state.log = addLog(state.log, "All experts eliminated. Game over — no winner.", "info");
          return state;
        }

        state.currentRound++;
        const surviving = state.managers
          .flatMap((m) => m.experts)
          .filter((e) => e.status === "active").length;
        state.log = addLog(
          state.log,
          `Round ${state.currentRound} started — ${surviving} experts remaining`,
          "round"
        );
        state.currentTry = 1;
        return state;
      }

      // Execute current try for ALL active experts in parallel
      const tryNum = state.currentTry;

      for (const manager of state.managers) {
        if (manager.status !== "active") continue;

        for (const expert of manager.experts) {
          if (expert.status !== "active") continue;

          const guess = executeStrategy(expert, settings, tryNum);
          const stars = scoreGuess(guess, manager.secretCombination);

          const tryResult: TryResult = {
            round: state.currentRound,
            tryNumber: tryNum,
            guess,
            stars,
            bestInRound: false,
          };

          expert.tryHistory.push(tryResult);
          expert.roundHistory.push(tryResult);
          updateConfidenceMap(expert, tryResult);

          if (stars > expert.currentRoundScore) {
            expert.currentRoundScore = stars;
          }

          state.currentExpertId = expert.id;

          const starStr = "★".repeat(stars) + "☆".repeat(settings.combinationSize - stars);
          state.log = addLog(
            state.log,
            `${expert.name} (${expert.personality}) → ${starStr} [${guess.join(", ")}]`,
            "score"
          );

          // Check win condition
          if (stars >= 5) {
            expert.status = "winner";
            manager.status = "winner";
            state.phase = "ended";
            state.result = "winner_found";
            state.winner = {
              managerId: manager.id,
              managerSecretCombination: manager.secretCombination,
              expertId: expert.id,
              expertName: expert.name,
              expertPersonality: expert.personality,
              winningGuess: guess,
              winningStars: stars,
              roundsPlayed: state.currentRound,
              totalTries: expert.tryHistory.length,
            };
            state.log = addLog(
              state.log,
              `🏆 ${expert.name} scored ${stars}★! WINNER FOUND!`,
              "winner"
            );
            return state;
          }
        }
      }

      // Advance to next try
      state.currentTry = tryNum + 1;
      return state;
    });
  }, []);

  const handleCountdown = useCallback(() => {
    setGameState((prev) => {
      if (prev.phase !== "running") return prev;
      const remaining = prev.timeRemaining - 1;
      if (remaining <= 0) {
        workerRef.current?.postMessage({ type: "stop-all" });
        return {
          ...prev,
          phase: "ended",
          timeRemaining: 0,
          result: "time_up",
          log: addLog(prev.log, "⏱ Time's up! Game over.", "info"),
        };
      }
      return { ...prev, timeRemaining: remaining };
    });
  }, []);

  const startWorkerListeners = useCallback(
    (speedMs: number) => {
      const worker = getWorker();
      worker.onmessage = (e: MessageEvent<{ type: string }>) => {
        if (e.data.type === "tick") tick();
        else if (e.data.type === "countdown") handleCountdown();
      };
      worker.postMessage({ type: "start-tick", ms: speedMs });
      worker.postMessage({ type: "start-countdown" });
    },
    [getWorker, tick, handleCountdown]
  );

  const startGame = useCallback(
    (settings: GameSettings, importedProfile?: WinnerProfile, registry?: ExpertRegistry) => {
      clearIntervals();

      const managers = createManagers(settings, importedProfile, registry);
      const initialLog = addLog([], "Game started!", "info");
      const log = addLog(
        initialLog,
        `Round 1 started — ${settings.managerCount * settings.expertsPerManager} experts competing`,
        "round"
      );

      const newState: GameState = {
        phase: "running",
        currentRound: 1,
        currentTry: 1,
        currentExpertId: null,
        managers,
        timeRemaining: settings.timeLimitMinutes * 60,
        log,
        result: null,
        winner: null,
        settings,
      };

      setGameState(newState);
      startWorkerListeners(settings.simulationSpeedMs);
    },
    [clearIntervals, startWorkerListeners]
  );

  const pauseGame = useCallback(() => {
    clearIntervals();
    setGameState((prev) => ({ ...prev, phase: "paused" }));
  }, [clearIntervals]);

  const resumeGame = useCallback(() => {
    setGameState((prev) => {
      if (prev.phase !== "paused") return prev;
      startWorkerListeners(prev.settings.simulationSpeedMs);
      return { ...prev, phase: "running" as const };
    });
  }, [startWorkerListeners]);

  const resetGame = useCallback(() => {
    workerRef.current?.postMessage({ type: "stop-all" });
    workerRef.current?.terminate();
    workerRef.current = null;
    setGameState((prev) => createInitialState(prev.settings));
  }, []);

  // Terminate worker when the component using this hook unmounts
  useEffect(() => {
    return () => {
      workerRef.current?.postMessage({ type: "stop-all" });
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const restoreGame = useCallback((state: GameState) => {
    clearIntervals();
    // Restore in paused state so user can resume the simulation
    setGameState({
      ...state,
      phase: state.phase === "ended" ? "ended" : "paused",
      log: state.phase === "ended"
        ? state.log
        : addLog(state.log, "⏸ Game restored from previous session", "info"),
    });
  }, [clearIntervals]);

  return { gameState, startGame, pauseGame, resumeGame, resetGame, restoreGame };
}
