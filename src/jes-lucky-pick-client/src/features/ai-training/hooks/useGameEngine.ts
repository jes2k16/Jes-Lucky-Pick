import { useState, useRef, useCallback } from "react";
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
} from "../types/game";
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

function createManagers(
  settings: GameSettings,
  importedProfile?: WinnerProfile
): Manager[] {
  const managers: Manager[] = [];
  let nameIdx = 0;

  for (let m = 0; m < settings.managerCount; m++) {
    const managerId = `mgr-${m + 1}`;
    const secret = generateSecretCombination(settings);
    const experts: Expert[] = [];

    for (let e = 0; e < settings.expertsPerManager; e++) {
      const expertId = `${managerId}-exp-${e + 1}`;
      const personality = PERSONALITIES[e % PERSONALITIES.length];
      const name = EXPERT_NAMES[nameIdx++ % EXPERT_NAMES.length];

      const useProfile =
        importedProfile && m === 0 && e === 0 && personality === importedProfile.personality;

      experts.push({
        id: expertId,
        name,
        managerId,
        personality: useProfile ? importedProfile.personality : personality,
        status: "active",
        confidenceMap: useProfile
          ? { ...importedProfile.confidenceMap }
          : initializeConfidenceMap(settings),
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
    })
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearIntervals = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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

  const startGame = useCallback(
    (settings: GameSettings, importedProfile?: WinnerProfile) => {
      clearIntervals();

      const managers = createManagers(settings, importedProfile);
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

      // Start tick interval
      intervalRef.current = setInterval(tick, settings.simulationSpeedMs);

      // Start timer (1s countdown)
      timerRef.current = setInterval(() => {
        setGameState((prev) => {
          if (prev.phase !== "running") return prev;
          const remaining = prev.timeRemaining - 1;
          if (remaining <= 0) {
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
      }, 1000);
    },
    [tick, clearIntervals]
  );

  const pauseGame = useCallback(() => {
    clearIntervals();
    setGameState((prev) => ({ ...prev, phase: "paused" }));
  }, [clearIntervals]);

  const resumeGame = useCallback(() => {
    setGameState((prev) => {
      if (prev.phase !== "paused") return prev;
      const newState = { ...prev, phase: "running" as const };
      intervalRef.current = setInterval(tick, prev.settings.simulationSpeedMs);
      timerRef.current = setInterval(() => {
        setGameState((p) => {
          if (p.phase !== "running") return p;
          const remaining = p.timeRemaining - 1;
          if (remaining <= 0) {
            return {
              ...p,
              phase: "ended",
              timeRemaining: 0,
              result: "time_up",
              log: addLog(p.log, "⏱ Time's up! Game over.", "info"),
            };
          }
          return { ...p, timeRemaining: remaining };
        });
      }, 1000);
      return newState;
    });
  }, [tick]);

  const resetGame = useCallback(() => {
    clearIntervals();
    setGameState((prev) => createInitialState(prev.settings));
  }, [clearIntervals]);

  return { gameState, startGame, pauseGame, resumeGame, resetGame };
}
