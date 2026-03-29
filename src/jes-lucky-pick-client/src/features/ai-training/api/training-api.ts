import apiClient from "@/lib/api-client";
import type { ExpertCareer, ExpertLottoStats } from "../types/expert-registry";

// ── Training Sessions ──

export interface TrainingSessionRequest {
  id?: string;
  gameMode: string;
  lottoGameCode: string;
  result: string;
  durationSeconds: number;
  totalRounds: number;
  totalExperts: number;
  survivingExperts: number;
  settingsJson: string;
  winnerJson: string | null;
  leaderboardJson: string | null;
  playedAt: string;
}

export async function saveTrainingSession(request: TrainingSessionRequest) {
  const { data } = await apiClient.post("/training/sessions", request);
  return data;
}

export async function getTrainingSessions(page = 1, pageSize = 20) {
  const { data } = await apiClient.get("/training/sessions", {
    params: { page, pageSize },
  });
  return data;
}

// ── Expert Careers ──

interface ExpertCareerApiDto {
  id: string;
  name: string;
  personality: string;
  gamesPlayed: number;
  wins: number;
  eliminations: number;
  totalRoundsPlayed: number;
  bestEverScore: number;
  avgRoundScore: number;
  lastPlayedAt: string | null;
  isFavorite: boolean;
  lottoStats: {
    lottoGameCode: string;
    gamesPlayed: number;
    wins: number;
    eliminations: number;
    confidenceMapJson: string;
    gameMemoriesJson: string;
    careerSummaryJson: string | null;
  }[];
}

function mapApiCareerToLocal(dto: ExpertCareerApiDto): ExpertCareer {
  const byLottoGame: Record<string, ExpertLottoStats> = {};
  for (const s of dto.lottoStats) {
    byLottoGame[s.lottoGameCode] = {
      lottoGameCode: s.lottoGameCode as ExpertLottoStats["lottoGameCode"],
      gamesPlayed: s.gamesPlayed,
      wins: s.wins,
      eliminations: s.eliminations,
      confidenceMap: JSON.parse(s.confidenceMapJson || "{}"),
      gameMemories: JSON.parse(s.gameMemoriesJson || "[]"),
      careerSummary: s.careerSummaryJson ? JSON.parse(s.careerSummaryJson) : null,
    };
  }
  return {
    id: dto.id,
    name: dto.name,
    personality: dto.personality as ExpertCareer["personality"],
    gamesPlayed: dto.gamesPlayed,
    wins: dto.wins,
    eliminations: dto.eliminations,
    totalRoundsPlayed: dto.totalRoundsPlayed,
    bestEverScore: dto.bestEverScore,
    avgRoundScore: dto.avgRoundScore,
    lastPlayedAt: dto.lastPlayedAt,
    isFavorite: dto.isFavorite,
    byLottoGame,
  };
}

function mapLocalCareerToApi(career: ExpertCareer) {
  return {
    id: career.id,
    name: career.name,
    personality: career.personality,
    gamesPlayed: career.gamesPlayed,
    wins: career.wins,
    eliminations: career.eliminations,
    totalRoundsPlayed: career.totalRoundsPlayed,
    bestEverScore: career.bestEverScore,
    avgRoundScore: career.avgRoundScore,
    lastPlayedAt: career.lastPlayedAt,
    isFavorite: career.isFavorite ?? false,
    lottoStats: Object.values(career.byLottoGame).map((s) => ({
      lottoGameCode: s.lottoGameCode,
      gamesPlayed: s.gamesPlayed,
      wins: s.wins,
      eliminations: s.eliminations,
      confidenceMapJson: JSON.stringify(s.confidenceMap),
      gameMemoriesJson: JSON.stringify(s.gameMemories),
      careerSummaryJson: s.careerSummary ? JSON.stringify(s.careerSummary) : null,
    })),
  };
}

export async function getExpertCareers(): Promise<ExpertCareer[]> {
  const { data } = await apiClient.get<ExpertCareerApiDto[]>("/training/careers");
  return data.map(mapApiCareerToLocal);
}

export async function syncExpertCareers(careers: ExpertCareer[]): Promise<{ synced: number }> {
  // Deduplicate by name+personality, then by id — keep highest gamesPlayed in each case
  const byNamePersonality = new Map<string, ExpertCareer>();
  for (const c of careers) {
    const key = `${c.name}:${c.personality}`;
    const ex = byNamePersonality.get(key);
    if (!ex || c.gamesPlayed > ex.gamesPlayed) byNamePersonality.set(key, c);
  }
  const byId = new Map<string, ExpertCareer>();
  for (const c of byNamePersonality.values()) {
    const ex = byId.get(c.id);
    if (!ex || c.gamesPlayed > ex.gamesPlayed) byId.set(c.id, c);
  }
  const payload = Array.from(byId.values()).map(mapLocalCareerToApi);
  const { data } = await apiClient.post("/training/careers/sync", payload);
  return data;
}

export async function patchExpertCareer(
  id: string,
  updates: { name?: string; isFavorite?: boolean }
): Promise<void> {
  await apiClient.patch(`/training/careers/${id}`, updates);
}

export async function getExpertCareerStats(
  name: string,
  personality: string
): Promise<ExpertCareer | null> {
  try {
    const { data } = await apiClient.get<ExpertCareerApiDto>(
      `/training/careers/${encodeURIComponent(name)}/${encodeURIComponent(personality)}/stats`
    );
    return mapApiCareerToLocal(data);
  } catch {
    return null;
  }
}
