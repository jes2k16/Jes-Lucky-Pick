// ── Enums & Unions ──

export type ExpertPersonality = "Scanner" | "Sticky" | "Gambler" | "Analyst";
export type GameMode = "simulation" | "ai-agent" | "scheduled";
export type ConcurrencyMode = "sequential" | "fully-parallel";
export type GamePhase = "setup" | "running" | "paused" | "ended";
export type GameResult = "winner_found" | "all_eliminated" | "time_up" | "interrupted";
export type ExpertStatus = "active" | "eliminated" | "winner";
export type ManagerStatus = "active" | "failed" | "winner";
export type LogEntryType = "info" | "score" | "elimination" | "winner" | "round";

// ── Lotto Games ──

export type LottoGameType = "6/42" | "6/45" | "6/49" | "6/55" | "6/58";

export const LOTTO_GAMES: Record<LottoGameType, { label: string; min: number; max: number; size: number }> = {
  "6/42": { label: "Lotto 6/42", min: 1, max: 42, size: 6 },
  "6/45": { label: "Mega Lotto 6/45", min: 1, max: 45, size: 6 },
  "6/49": { label: "Super Lotto 6/49", min: 1, max: 49, size: 6 },
  "6/55": { label: "Grand Lotto 6/55", min: 1, max: 55, size: 6 },
  "6/58": { label: "Ultra Lotto 6/58", min: 1, max: 58, size: 6 },
};

// ── Settings ──

export interface GameSettings {
  lottoGame: LottoGameType;
  numberRangeMin: number;
  numberRangeMax: number;
  combinationSize: number;
  managerCount: number;
  expertsPerManager: number;
  timeLimitMinutes: number;
  simulationSpeedMs: number;
  gameMode: GameMode;
  concurrencyMode: ConcurrencyMode;
  model: string;
  useVeterans: boolean;
  /** Historical draw combinations for manager secrets (fetched at game start) */
  historicalDraws?: number[][];
  /** Historical draw items with dates — used to show the source draw date in results */
  historicalDrawItems?: { numbers: number[]; drawDate: string }[];
}

export const DEFAULT_SETTINGS: GameSettings = {
  lottoGame: "6/42",
  numberRangeMin: 1,
  numberRangeMax: 42,
  combinationSize: 6,
  managerCount: 3,
  expertsPerManager: 4,
  timeLimitMinutes: 5,
  simulationSpeedMs: 500,
  gameMode: "simulation",
  concurrencyMode: "fully-parallel",
  model: "claude-haiku-4-5-20251001",
  useVeterans: false,
};

// ── Try & Round ──

export interface TryResult {
  round: number;
  tryNumber: number;
  guess: number[];
  stars: number;
  bestInRound: boolean;
}

// ── Expert ──

export interface Expert {
  id: string;
  name: string;
  managerId: string;
  personality: ExpertPersonality;
  status: ExpertStatus;
  confidenceMap: Record<number, number>;
  tryHistory: TryResult[];
  roundHistory: TryResult[]; // current round only, reset each round
  roundScores: number[];
  eliminatedAtRound: number | null;
  currentRoundScore: number;
}

// ── Manager ──

export interface Manager {
  id: string;
  secretCombination: number[];
  status: ManagerStatus;
  experts: Expert[];
}

// ── Activity Log ──

export interface ActivityLogEntry {
  timestamp: number;
  message: string;
  type: LogEntryType;
}

// ── Winner ──

export interface WinnerInfo {
  managerId: string;
  managerSecretCombination: number[];
  expertId: string;
  expertName: string;
  expertPersonality: ExpertPersonality;
  winningGuess: number[];
  winningStars: number;
  roundsPlayed: number;
  totalTries: number;
}

// ── Game State ──

export interface GameState {
  phase: GamePhase;
  currentRound: number;
  currentTry: number;
  currentExpertId: string | null;
  managers: Manager[];
  timeRemaining: number; // seconds
  log: ActivityLogEntry[];
  result: GameResult | null;
  winner: WinnerInfo | null;
  settings: GameSettings;
}

// ── Export / Import ──

export interface WinnerProfile {
  version: 1;
  exportedAt: string;
  settings: GameSettings;
  winner: WinnerInfo;
  confidenceMap: Record<number, number>;
  personality: ExpertPersonality;
  fullHistory: TryResult[];
}

// ── Game History ──

export interface GameHistoryEntry {
  id: string;
  playedAt: string; // ISO string
  gameMode: GameMode;
  result: GameResult;
  settings: GameSettings;
  winner: WinnerInfo | null;
  winnerProfile: WinnerProfile | null;
  durationSeconds: number;
  totalRounds: number;
  totalExperts: number;
  survivingExperts: number;
  leaderboard: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  expertName: string;
  personality: ExpertPersonality;
  managerLabel: string;
  bestScore: number;
  totalTries: number;
  status: ExpertStatus;
  eliminatedAtRound: number | null;
}

// ── Game Engine Interface (shared by simulation + AI agent) ──

export interface GameEngine {
  gameState: GameState;
  startGame: (settings: GameSettings, importedProfile?: WinnerProfile, registry?: import("./expert-registry").ExpertRegistry) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  restoreGame: (state: GameState) => void;
}
