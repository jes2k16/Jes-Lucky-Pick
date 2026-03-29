import type { ExpertPersonality, LottoGameType } from "./game";

// ── Game Memory ──

export interface GameMemory {
  gameId: string;
  playedAt: string;
  result: string; // "won" | "eliminated_round_N" | "survived_time_up"
  roundsPlayed: number;
  bestScore: number;
  bestGuess: number[];
  secretCombo: number[];
  matchedNumbers: number[];
  topConfidence: number[];
  bottomConfidence: number[];
  lesson: string;
  mode?: "simulation" | "ai-agent";
}

// ── Career Summary (for games older than stored memories) ──

export interface CareerSummary {
  totalGames: number;
  totalWins: number;
  totalEliminations: number;
  recurringSecretNumbers: number[];
  recurringBestGuessNumbers: number[];
  trend: string;
}

// ── Per-Lotto-Game Stats ──

export interface ExpertLottoStats {
  lottoGameCode: LottoGameType;
  gamesPlayed: number;
  wins: number;
  eliminations: number;
  confidenceMap: Record<number, number>;
  gameMemories: GameMemory[];
  careerSummary: CareerSummary | null;
}

// ── Expert Career ──

export interface ExpertCareer {
  id: string;
  name: string;
  personality: ExpertPersonality;
  gamesPlayed: number;
  wins: number;
  eliminations: number;
  totalRoundsPlayed: number;
  bestEverScore: number;
  avgRoundScore: number;
  lastPlayedAt: string | null;
  isFavorite?: boolean;
  byLottoGame: Record<string, ExpertLottoStats>;
}

// ── Registry (localStorage shape) ──

export interface ExpertRegistry {
  version: 1;
  experts: ExpertCareer[];
}
