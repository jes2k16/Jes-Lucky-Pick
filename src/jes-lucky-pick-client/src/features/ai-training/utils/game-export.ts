import type { GameState, WinnerProfile } from "../types/game";

export function exportWinnerProfile(state: GameState): WinnerProfile | null {
  if (!state.winner) return null;

  const winningManager = state.managers.find(
    (m) => m.id === state.winner!.managerId
  );
  const winningExpert = winningManager?.experts.find(
    (e) => e.id === state.winner!.expertId
  );

  if (!winningExpert) return null;

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    winner: state.winner,
    confidenceMap: { ...winningExpert.confidenceMap },
    personality: winningExpert.personality,
    fullHistory: [...winningExpert.tryHistory],
  };
}

export function downloadProfile(profile: WinnerProfile): void {
  const json = JSON.stringify(profile, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `winner-${profile.winner.expertName.toLowerCase()}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProfile(file: File): Promise<WinnerProfile> {
  const text = await file.text();
  const data = JSON.parse(text);

  // Validate structure
  if (data.version !== 1) throw new Error("Unsupported profile version");
  if (!data.winner) throw new Error("Missing winner data");
  if (!data.confidenceMap || typeof data.confidenceMap !== "object")
    throw new Error("Missing or invalid confidenceMap");
  if (!data.personality) throw new Error("Missing personality");
  if (!data.fullHistory || !Array.isArray(data.fullHistory))
    throw new Error("Missing or invalid fullHistory");

  return data as WinnerProfile;
}
