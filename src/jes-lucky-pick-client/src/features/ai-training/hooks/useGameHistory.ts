import { useState, useCallback } from "react";
import type {
  GameState,
  GameHistoryEntry,
  LeaderboardEntry,
  WinnerProfile,
} from "../types/game";
import { saveTrainingSession } from "../api/training-api";

const STORAGE_KEY = "jes-number-training-history";
const MAX_ENTRIES = 5000;

function loadHistory(): GameHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GameHistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: GameHistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function useGameHistory() {
  const [history, setHistory] = useState<GameHistoryEntry[]>(loadHistory);

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

    // Build winner profile if there's a winner
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

    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, MAX_ENTRIES);
      saveHistory(updated);
      return updated;
    });

    // Fire-and-forget sync to database
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
      leaderboardJson: JSON.stringify(entry.leaderboard),
      playedAt: entry.playedAt,
    }).catch(() => {
      // Will retry on next sync
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addEntry, deleteEntry, clearHistory };
}
