import { useState, useCallback, useEffect } from "react";
import type {
  GameState,
  GameHistoryEntry,
  LeaderboardEntry,
  WinnerProfile,
} from "../types/game";
import { saveTrainingSession, getTrainingSessions, deleteTrainingSession } from "../api/training-api";

export function useGameHistory() {
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);

  // Load from DB on mount
  useEffect(() => {
    getTrainingSessions()
      .then((entries) => setHistory(entries))
      .catch(() => {
        // Server unavailable — history stays empty for this session
      });
  }, []);

  const addEntry = useCallback((gameState: GameState) => {
    if (!gameState.result) return;

    const allExperts = gameState.managers.flatMap((m) =>
      m.experts.map((e) => ({
        ...e,
        managerLabel: m.id.toUpperCase(),
      }))
    );

    const leaderboard: LeaderboardEntry[] = allExperts
      .map((e) => ({
        expertName: e.name,
        personality: e.personality,
        managerLabel: e.managerLabel,
        bestScore:
          e.tryHistory.length > 0
            ? Math.max(...e.tryHistory.map((t) => t.stars))
            : 0,
        totalTries: e.tryHistory.length,
        status: e.status,
        eliminatedAtRound: e.eliminatedAtRound,
      }))
      .sort((a, b) => b.bestScore - a.bestScore);

    const survivingExperts = allExperts.filter(
      (e) => e.status === "active" || e.status === "winner"
    ).length;

    const totalSeconds = gameState.settings.timeLimitMinutes * 60;
    const durationSeconds = totalSeconds - gameState.timeRemaining;

    let winnerProfile: WinnerProfile | null = null;
    if (gameState.winner) {
      const winnerExpert = allExperts.find(
        (e) => e.id === gameState.winner!.expertId
      );
      if (winnerExpert) {
        winnerProfile = {
          version: 1,
          exportedAt: new Date().toISOString(),
          settings: gameState.settings,
          winner: gameState.winner,
          confidenceMap: { ...winnerExpert.confidenceMap },
          personality: winnerExpert.personality,
          fullHistory: [...winnerExpert.tryHistory],
        };
      }
    }

    const entry: GameHistoryEntry = {
      id: crypto.randomUUID(),
      playedAt: new Date().toISOString(),
      gameMode: gameState.settings.gameMode,
      result: gameState.result,
      settings: gameState.settings,
      winner: gameState.winner,
      winnerProfile,
      durationSeconds,
      totalRounds: gameState.currentRound,
      totalExperts: allExperts.length,
      survivingExperts,
      leaderboard,
    };

    // Optimistic update
    setHistory((prev) => [entry, ...prev]);

    // Persist to DB — fire-and-forget
    saveTrainingSession({
      id: entry.id,
      gameMode: entry.gameMode,
      lottoGameCode: entry.settings.lottoGame,
      result: entry.result,
      durationSeconds: entry.durationSeconds,
      totalRounds: entry.totalRounds,
      totalExperts: entry.totalExperts,
      survivingExperts: entry.survivingExperts,
      settingsJson: JSON.stringify(entry.settings),
      winnerJson: entry.winner ? JSON.stringify(entry.winner) : null,
      winnerProfileJson: winnerProfile ? JSON.stringify(winnerProfile) : null,
      leaderboardJson: JSON.stringify(entry.leaderboard),
      playedAt: entry.playedAt,
    }).catch(() => {});
  }, []);

  const deleteEntry = useCallback((id: string) => {
    // Optimistic update
    setHistory((prev) => prev.filter((e) => e.id !== id));
    // Persist to DB
    deleteTrainingSession(id).catch(() => {});
  }, []);

  return { history, addEntry, deleteEntry };
}
