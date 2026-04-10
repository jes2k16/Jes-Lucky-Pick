import { useState, useRef, useCallback, useEffect } from "react";
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
  LottoGameType,
} from "../types/game";
import type { ExpertRegistry, ExpertCareer } from "../types/expert-registry";
import { buildSeededConfidenceMap, buildCareerContext } from "./useExpertRegistry";
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
      .sort(() => Math.random() - 0.5);
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
        const vetIdx = pool.findIndex((c) => !usedInGame.has(c.name));
        if (vetIdx !== -1) {
          veteranCareer = pool[vetIdx];
          name = veteranCareer.name;
          pool.splice(vetIdx, 1);
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
      concurrencyMode: "fully-parallel",
      model: "claude-haiku-4-5-20251001",
      useVeterans: false,
    })
  );

  const connectionRef = useRef<HubConnection | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const runningRef = useRef(false);
  const cancelledRef = useRef(false);
  const registryRef = useRef<ExpertRegistry | undefined>(undefined);

  const getWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("../utils/timer.worker.ts", import.meta.url),
        { type: "module" }
      );
    }
    return workerRef.current;
  }, []);

  const clearTimer = useCallback(() => {
    workerRef.current?.postMessage({ type: "stop-countdown" });
  }, []);

  // Terminate worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.postMessage({ type: "stop-all" });
      workerRef.current?.terminate();
      workerRef.current = null;
    };
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

      // Build career context for veteran AI experts
      let careerContextJson = "";
      if (settings.useVeterans && registryRef.current) {
        const career = registryRef.current.experts.find(
          (c) => c.name === expert.name && c.personality === expert.personality
        );
        if (career) {
          const ctx = buildCareerContext(career, settings.lottoGame);
          if (ctx) careerContextJson = ctx;
        }
      }

      const result = await connection.invoke<number[] | null>(
        "ExecuteExpertTurn",
        expert.personality,
        settings.model,
        settings.combinationSize,
        numberRange,
        roundNumber,
        tryNumber,
        confidenceMapJson,
        tryHistoryJson,
        careerContextJson
      );

      return result;
    },
    []
  );

  /**
   * Core game loop — dispatches experts sequentially, parallel-per-manager,
   * or fully-parallel depending on settings.concurrencyMode.
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

      /**
       * Run all 6 tries for a single expert.
       * Shared across all concurrency modes — safe to run in parallel
       * because each expert mutates only its own object.
       */
      const runExpertAllTries = async (
        expert: Expert,
        manager: Manager,
        round: number
      ) => {
        for (let tryNum = 1; tryNum <= 6; tryNum++) {
          if (cancelledRef.current) return;

          // No artificial delay in AI mode — CLI latency provides natural pacing

          // Wait while paused
          while (!runningRef.current && !cancelledRef.current) {
            await new Promise((r) => setTimeout(r, 500));
          }
          if (cancelledRef.current) return;

          setGameState((prev) => ({
            ...prev,
            currentExpertId: expert.id,
            currentTry: tryNum,
          }));

          let guess: number[] | null = null;
          try {
            guess = await executeAiExpertTurn(
              connection,
              expert,
              settings,
              round,
              tryNum
            );
          } catch (err) {
            // Invocation error (e.g. server exception) — treat as AI failure, use fallback
            setGameState((prev) => ({
              ...prev,
              log: addLog(
                prev.log,
                `AI Error (${expert.name}): ${err instanceof Error ? err.message : "Unknown error"}`,
                "info"
              ),
            }));
          }

          if (cancelledRef.current) return;

          // AI failed or threw — use fallback random guess
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
            const fStars = scoreGuess(fallback, manager.secretCombination);
            const fResult: TryResult = {
              round,
              tryNumber: tryNum,
              guess: fallback,
              stars: fStars,
              bestInRound: false,
            };
            expert.tryHistory.push(fResult);
            expert.roundHistory.push(fResult);
            if (fStars > expert.currentRoundScore)
              expert.currentRoundScore = fStars;

            setGameState((prev) => ({
              ...prev,
              log: addLog(
                prev.log,
                `${expert.name} (${expert.personality}) → AI failed, fallback: ${"★".repeat(fStars)}${"☆".repeat(settings.combinationSize - fStars)} [${fallback.join(", ")}]`,
                "score"
              ),
              managers: structuredClone(managers),
            }));
            continue;
          }

          const stars = scoreGuess(guess, manager.secretCombination);
          const tryResult: TryResult = {
            round,
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
            "★".repeat(stars) + "☆".repeat(settings.combinationSize - stars);

          // Check win
          if (stars >= 5) {
            expert.status = "winner";
            manager.status = "winner";
            cancelledRef.current = true; // stop all other parallel tasks
            clearTimer();
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
                roundsPlayed: round,
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

          // Update confidence map
          for (const num of guess) {
            expert.confidenceMap[num] =
              (expert.confidenceMap[num] || 0) + (stars > 0 ? stars * 0.1 : -0.3);
          }
        }
      };

      /**
       * Run ONE try for a single expert without firing state updates.
       * Used in fully-parallel mode to batch all expert results per try into
       * one atomic setGameState call (mirrors how the simulation tick works).
       */
      const runSingleTry = async (
        expert: Expert,
        manager: Manager,
        round: number,
        tryNum: number
      ): Promise<{
        logMessage: string;
        logType: ActivityLogEntry["type"];
        winner: GameState["winner"] | null;
      } | null> => {
        if (cancelledRef.current) return null;

        let guess: number[] | null = null;
        try {
          guess = await executeAiExpertTurn(connection, expert, settings, round, tryNum);
        } catch {
          // AI invocation error — fallback below
        }

        if (cancelledRef.current) return null;

        if (!guess) {
          const fallback: number[] = [];
          while (fallback.length < settings.combinationSize) {
            const n =
              Math.floor(
                Math.random() * (settings.numberRangeMax - settings.numberRangeMin + 1)
              ) + settings.numberRangeMin;
            if (!fallback.includes(n)) fallback.push(n);
          }
          const fStars = scoreGuess(fallback, manager.secretCombination);
          const fResult: TryResult = { round, tryNumber: tryNum, guess: fallback, stars: fStars, bestInRound: false };
          expert.tryHistory.push(fResult);
          expert.roundHistory.push(fResult);
          if (fStars > expert.currentRoundScore) expert.currentRoundScore = fStars;
          return {
            logMessage: `${expert.name} (${expert.personality}) → AI failed, fallback: ${"★".repeat(fStars)}${"☆".repeat(settings.combinationSize - fStars)} [${fallback.join(", ")}]`,
            logType: "score",
            winner: null,
          };
        }

        const stars = scoreGuess(guess, manager.secretCombination);
        const tryResult: TryResult = { round, tryNumber: tryNum, guess, stars, bestInRound: false };
        expert.tryHistory.push(tryResult);
        expert.roundHistory.push(tryResult);
        if (stars > expert.currentRoundScore) expert.currentRoundScore = stars;

        for (const num of guess) {
          expert.confidenceMap[num] =
            (expert.confidenceMap[num] || 0) + (stars > 0 ? stars * 0.1 : -0.3);
        }

        const starStr = "★".repeat(stars) + "☆".repeat(settings.combinationSize - stars);

        if (stars >= 5) {
          expert.status = "winner";
          manager.status = "winner";
          return {
            logMessage: `${expert.name} (${expert.personality}) → ${starStr} [${guess.join(", ")}]`,
            logType: "score",
            winner: {
              managerId: manager.id,
              managerSecretCombination: manager.secretCombination,
              expertId: expert.id,
              expertName: expert.name,
              expertPersonality: expert.personality,
              winningGuess: guess,
              winningStars: stars,
              roundsPlayed: round,
              totalTries: expert.tryHistory.length,
            },
          };
        }

        return {
          logMessage: `${expert.name} (${expert.personality}) → ${starStr} [${guess.join(", ")}]`,
          logType: "score",
          winner: null,
        };
      };

      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (cancelledRef.current) break;

        // Dispatch experts based on concurrency mode
        if (settings.concurrencyMode === "fully-parallel") {
          // Process try-by-try so all expert results per try are batched into
          // one atomic state update — same rhythm as the simulation tick.
          for (let tryNum = 1; tryNum <= 6; tryNum++) {
            if (cancelledRef.current) break;

            // No artificial delay in AI mode — CLI latency provides natural pacing

            // Wait while paused
            while (!runningRef.current && !cancelledRef.current) {
              await new Promise((r) => setTimeout(r, 500));
            }
            if (cancelledRef.current) break;

            const activeExperts = managers
              .filter((m) => m.status === "active")
              .flatMap((m) =>
                m.experts
                  .filter((e) => e.status === "active")
                  .map((e) => ({ expert: e, manager: m }))
              );

            // All experts execute this try in parallel
            const results = await Promise.all(
              activeExperts.map(({ expert, manager }) =>
                runSingleTry(expert, manager, currentRound, tryNum)
              )
            );

            if (cancelledRef.current) break;

            const winnerResult = results.find((r) => r?.winner != null);

            // One batched state update for all experts this try
            setGameState((prev) => {
              let newLog = prev.log;
              for (const r of results) {
                if (r) newLog = addLog(newLog, r.logMessage, r.logType);
              }
              if (winnerResult?.winner) {
                const w = winnerResult.winner;
                return {
                  ...prev,
                  phase: "ended",
                  result: "winner_found",
                  currentExpertId: w.expertId,
                  currentTry: tryNum,
                  log: addLog(newLog, `🏆 ${w.expertName} scored ${w.winningStars}★! WINNER FOUND!`, "winner"),
                  managers: structuredClone(managers),
                  winner: w,
                };
              }
              return {
                ...prev,
                currentTry: tryNum,
                log: newLog,
                managers: structuredClone(managers),
              };
            });

            if (winnerResult) {
              cancelledRef.current = true;
              clearTimer();
              return;
            }
          }
        } else {
          // Sequential: one expert at a time
          for (const manager of managers) {
            if (manager.status !== "active" || cancelledRef.current) continue;
            for (const expert of manager.experts) {
              if (expert.status !== "active" || cancelledRef.current) continue;
              await runExpertAllTries(expert, manager, currentRound);
            }
          }
        }

        if (cancelledRef.current) break;

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

  const handleCountdown = useCallback(() => {
    setGameState((prev) => {
      if (prev.phase !== "running") return prev;
      const remaining = prev.timeRemaining - 1;
      if (remaining <= 0) {
        cancelledRef.current = true;
        runningRef.current = false;
        workerRef.current?.postMessage({ type: "stop-countdown" });
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
  }, []);

  const startGame = useCallback(
    (settings: GameSettings, importedProfile?: WinnerProfile, registry?: ExpertRegistry) => {
      clearTimer();
      cancelledRef.current = false;
      runningRef.current = true;
      registryRef.current = registry;

      const managers = createManagers(settings, importedProfile, registry);

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

      // Start worker countdown timer (not throttled in background tabs)
      const worker = getWorker();
      worker.onmessage = (e: MessageEvent<{ type: string }>) => {
        if (e.data.type === "countdown") handleCountdown();
      };
      worker.postMessage({ type: "start-countdown" });

      // Start the async game loop
      runGameLoop(managers, settings).catch((err) => {
        console.error("AI game loop error:", err);
        setGameState((prev) => ({
          ...prev,
          log: addLog(prev.log, `Game loop error: ${err.message}`, "info"),
        }));
      });
    },
    [clearTimer, getWorker, handleCountdown, runGameLoop]
  );

  const pauseGame = useCallback(() => {
    runningRef.current = false;
    clearTimer();
    setGameState((prev) => ({ ...prev, phase: "paused" }));
  }, [clearTimer]);

  const resumeGame = useCallback(() => {
    runningRef.current = true;
    const worker = getWorker();
    worker.onmessage = (e: MessageEvent<{ type: string }>) => {
      if (e.data.type === "countdown") handleCountdown();
    };
    worker.postMessage({ type: "start-countdown" });
    setGameState((prev) => ({ ...prev, phase: "running" }));
  }, [getWorker, handleCountdown]);

  const resetGame = useCallback(() => {
    cancelledRef.current = true;
    runningRef.current = false;
    workerRef.current?.postMessage({ type: "stop-all" });
    workerRef.current?.terminate();
    workerRef.current = null;

    // Disconnect SignalR
    if (connectionRef.current) {
      connectionRef.current.invoke("CancelGame").catch(() => {});
      connectionRef.current.stop().catch(() => {});
      connectionRef.current = null;
    }

    setGameState((prev) => createInitialState(prev.settings));
  }, []);

  const restoreGame = useCallback((state: GameState) => {
    cancelledRef.current = true;
    runningRef.current = false;
    clearTimer();

    // AI connection is lost on refresh — mark as interrupted if was in progress
    const wasInProgress = state.phase === "running" || state.phase === "paused";
    setGameState({
      ...state,
      phase: wasInProgress ? "ended" : state.phase,
      result: wasInProgress ? "interrupted" : state.result,
      log: wasInProgress
        ? addLog(state.log, "⚡ Game interrupted — browser was refreshed. AI connection lost.", "info")
        : state.log,
    });
  }, [clearTimer]);

  return { gameState, startGame, pauseGame, resumeGame, resetGame, restoreGame };
}
