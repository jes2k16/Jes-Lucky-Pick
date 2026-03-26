import { useState, useRef, useCallback } from "react";
import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
} from "@microsoft/signalr";
import { getAccessToken } from "@/lib/api-client";
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
  scoreGuess,
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

export function useAiGameEngine(): GameEngine {
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
      gameMode: "ai-agent",
      concurrencyMode: "sequential",
      model: "claude-haiku-4-5-20251001",
    })
  );

  const connectionRef = useRef<HubConnection | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);
  const cancelledRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const getConnection = useCallback(async (): Promise<HubConnection> => {
    if (connectionRef.current) return connectionRef.current;

    const connection = new HubConnectionBuilder()
      .withUrl("/hubs/game", {
        accessTokenFactory: () => getAccessToken() ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("GameError", (error: string) => {
      setGameState((prev) => ({
        ...prev,
        log: addLog(prev.log, `AI Error: ${error}`, "info"),
      }));
    });

    await connection.start();
    connectionRef.current = connection;
    return connection;
  }, []);

  /**
   * Run one expert turn via SignalR → Claude CLI.
   * Returns the AI-generated guess or null on failure.
   */
  const executeAiExpertTurn = useCallback(
    async (
      connection: HubConnection,
      expert: Expert,
      settings: GameSettings,
      roundNumber: number,
      tryNumber: number
    ): Promise<number[] | null> => {
      const numberRange = `${settings.numberRangeMin}-${settings.numberRangeMax}`;
      const confidenceMapJson = JSON.stringify(expert.confidenceMap);
      const tryHistoryJson = JSON.stringify(
        expert.tryHistory.map((t) => ({ guess: t.guess, stars: t.stars }))
      );

      const result = await connection.invoke<number[] | null>(
        "ExecuteExpertTurn",
        expert.personality,
        settings.model,
        settings.combinationSize,
        numberRange,
        roundNumber,
        tryNumber,
        confidenceMapJson,
        tryHistoryJson
      );

      return result;
    },
    []
  );

  /**
   * Core game loop — runs all experts sequentially through rounds.
   */
  const runGameLoop = useCallback(
    async (managers: Manager[], settings: GameSettings) => {
      const connection = await getConnection();
      let currentRound = 1;
      let log: ActivityLogEntry[] = [];

      log = addLog(log, "Game started! (AI Agent mode)", "info");
      log = addLog(
        log,
        `Round 1 started — ${settings.managerCount * settings.expertsPerManager} experts competing`,
        "round"
      );

      setGameState((prev) => ({
        ...prev,
        phase: "running",
        currentRound: 1,
        log,
        managers: structuredClone(managers),
      }));

      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (cancelledRef.current || !runningRef.current) break;

        // Each expert gets 6 tries per round
        for (const manager of managers) {
          if (manager.status !== "active") continue;

          for (const expert of manager.experts) {
            if (expert.status !== "active") continue;

            for (let tryNum = 1; tryNum <= 6; tryNum++) {
              if (cancelledRef.current || !runningRef.current) return;

              // Wait if paused
              while (!runningRef.current && !cancelledRef.current) {
                await new Promise((r) => setTimeout(r, 500));
              }
              if (cancelledRef.current) return;

              setGameState((prev) => ({
                ...prev,
                currentExpertId: expert.id,
                currentTry: tryNum,
              }));

              // Call AI via SignalR
              const guess = await executeAiExpertTurn(
                connection,
                expert,
                settings,
                currentRound,
                tryNum
              );

              if (!guess || cancelledRef.current) {
                // AI failed — use a fallback random guess
                if (!guess) {
                  const fallback: number[] = [];
                  while (fallback.length < settings.combinationSize) {
                    const n =
                      Math.floor(
                        Math.random() *
                          (settings.numberRangeMax - settings.numberRangeMin + 1)
                      ) + settings.numberRangeMin;
                    if (!fallback.includes(n)) fallback.push(n);
                  }
                  const stars = scoreGuess(fallback, manager.secretCombination);
                  const tryResult: TryResult = {
                    round: currentRound,
                    tryNumber: tryNum,
                    guess: fallback,
                    stars,
                    bestInRound: false,
                  };
                  expert.tryHistory.push(tryResult);
                  expert.roundHistory.push(tryResult);
                  if (stars > expert.currentRoundScore)
                    expert.currentRoundScore = stars;

                  setGameState((prev) => ({
                    ...prev,
                    log: addLog(
                      prev.log,
                      `${expert.name} (${expert.personality}) → AI failed, fallback: ${"★".repeat(stars)}${"☆".repeat(settings.combinationSize - stars)} [${fallback.join(", ")}]`,
                      "score"
                    ),
                    managers: structuredClone(managers),
                  }));
                  continue;
                }
                return;
              }

              const stars = scoreGuess(guess, manager.secretCombination);
              const tryResult: TryResult = {
                round: currentRound,
                tryNumber: tryNum,
                guess,
                stars,
                bestInRound: false,
              };
              expert.tryHistory.push(tryResult);
              expert.roundHistory.push(tryResult);
              if (stars > expert.currentRoundScore)
                expert.currentRoundScore = stars;

              const starStr =
                "★".repeat(stars) +
                "☆".repeat(settings.combinationSize - stars);

              // Check win
              if (stars >= 5) {
                expert.status = "winner";
                manager.status = "winner";
                setGameState((prev) => ({
                  ...prev,
                  phase: "ended",
                  result: "winner_found",
                  currentExpertId: expert.id,
                  managers: structuredClone(managers),
                  winner: {
                    managerId: manager.id,
                    managerSecretCombination: manager.secretCombination,
                    expertId: expert.id,
                    expertName: expert.name,
                    expertPersonality: expert.personality,
                    winningGuess: guess,
                    winningStars: stars,
                    roundsPlayed: currentRound,
                    totalTries: expert.tryHistory.length,
                  },
                  log: addLog(
                    addLog(
                      prev.log,
                      `${expert.name} (${expert.personality}) → ${starStr} [${guess.join(", ")}]`,
                      "score"
                    ),
                    `🏆 ${expert.name} scored ${stars}★! WINNER FOUND!`,
                    "winner"
                  ),
                }));
                clearTimer();
                return;
              }

              setGameState((prev) => ({
                ...prev,
                log: addLog(
                  prev.log,
                  `${expert.name} (${expert.personality}) → ${starStr} [${guess.join(", ")}]`,
                  "score"
                ),
                managers: structuredClone(managers),
              }));

              // Update confidence map based on result
              for (const num of guess) {
                if (stars > 0) {
                  expert.confidenceMap[num] =
                    (expert.confidenceMap[num] || 0) + stars * 0.1;
                } else {
                  expert.confidenceMap[num] =
                    (expert.confidenceMap[num] || 0) - 0.3;
                }
              }
            }
          }
        }

        // End of round — eliminations
        setGameState((prev) => ({
          ...prev,
          log: addLog(prev.log, `── Round ${currentRound} complete ──`, "round"),
        }));

        let anyAlive = false;
        for (const manager of managers) {
          if (manager.status !== "active") continue;

          for (const expert of manager.experts) {
            if (expert.status !== "active") continue;

            expert.roundScores.push(expert.currentRoundScore);

            if (expert.currentRoundScore < 2) {
              expert.status = "eliminated";
              expert.eliminatedAtRound = currentRound;
              setGameState((prev) => ({
                ...prev,
                log: addLog(
                  prev.log,
                  `☠ ${expert.name} eliminated (round score: ${expert.currentRoundScore}★)`,
                  "elimination"
                ),
              }));
            }
          }

          const hasActiveExperts = manager.experts.some(
            (e) => e.status === "active"
          );
          if (!hasActiveExperts) {
            manager.status = "failed";
            setGameState((prev) => ({
              ...prev,
              log: addLog(
                prev.log,
                `Manager ${manager.id} failed — all experts eliminated`,
                "elimination"
              ),
            }));
          } else {
            anyAlive = true;
          }

          // Reset round state
          for (const expert of manager.experts) {
            if (expert.status === "active") {
              expert.roundHistory = [];
              expert.currentRoundScore = 0;
            }
          }
        }

        if (!anyAlive) {
          setGameState((prev) => ({
            ...prev,
            phase: "ended",
            result: "all_eliminated",
            managers: structuredClone(managers),
            log: addLog(
              prev.log,
              "All experts eliminated. Game over — no winner.",
              "info"
            ),
          }));
          clearTimer();
          return;
        }

        currentRound++;
        const surviving = managers
          .flatMap((m) => m.experts)
          .filter((e) => e.status === "active").length;

        setGameState((prev) => ({
          ...prev,
          currentRound,
          managers: structuredClone(managers),
          log: addLog(
            prev.log,
            `Round ${currentRound} started — ${surviving} experts remaining`,
            "round"
          ),
        }));
      }
    },
    [getConnection, executeAiExpertTurn, clearTimer]
  );

  const startGame = useCallback(
    (settings: GameSettings, importedProfile?: WinnerProfile) => {
      clearTimer();
      cancelledRef.current = false;
      runningRef.current = true;

      const managers = createManagers(settings, importedProfile);

      const newState: GameState = {
        phase: "running",
        currentRound: 1,
        currentTry: 1,
        currentExpertId: null,
        managers,
        timeRemaining: settings.timeLimitMinutes * 60,
        log: [],
        result: null,
        winner: null,
        settings,
      };

      setGameState(newState);

      // Timer countdown
      timerRef.current = setInterval(() => {
        setGameState((prev) => {
          if (prev.phase !== "running") return prev;
          const remaining = prev.timeRemaining - 1;
          if (remaining <= 0) {
            cancelledRef.current = true;
            runningRef.current = false;
            // Cancel on backend
            connectionRef.current?.invoke("CancelGame").catch(() => {});
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

      // Start the async game loop
      runGameLoop(managers, settings).catch((err) => {
        console.error("AI game loop error:", err);
        setGameState((prev) => ({
          ...prev,
          log: addLog(prev.log, `Game loop error: ${err.message}`, "info"),
        }));
      });
    },
    [clearTimer, runGameLoop]
  );

  const pauseGame = useCallback(() => {
    runningRef.current = false;
    clearTimer();
    setGameState((prev) => ({ ...prev, phase: "paused" }));
  }, [clearTimer]);

  const resumeGame = useCallback(() => {
    runningRef.current = true;

    // Restart timer
    timerRef.current = setInterval(() => {
      setGameState((prev) => {
        if (prev.phase !== "running") return prev;
        const remaining = prev.timeRemaining - 1;
        if (remaining <= 0) {
          cancelledRef.current = true;
          runningRef.current = false;
          connectionRef.current?.invoke("CancelGame").catch(() => {});
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

    setGameState((prev) => ({ ...prev, phase: "running" }));
  }, []);

  const resetGame = useCallback(() => {
    cancelledRef.current = true;
    runningRef.current = false;
    clearTimer();

    // Disconnect SignalR
    if (connectionRef.current) {
      connectionRef.current.invoke("CancelGame").catch(() => {});
      connectionRef.current.stop().catch(() => {});
      connectionRef.current = null;
    }

    setGameState((prev) => createInitialState(prev.settings));
  }, [clearTimer]);

  return { gameState, startGame, pauseGame, resumeGame, resetGame };
}
