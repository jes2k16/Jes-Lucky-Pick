import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameSettings, WinnerProfile } from "@/features/ai-training/types/game";

interface TrainingSessionState {
  /** Whether a game is currently active (running or ended but not dismissed) */
  isGameActive: boolean;
  /** Settings for the active game */
  gameSettings: GameSettings | null;
  /** Optional imported winner profile */
  importedProfile: WinnerProfile | null;
  /** Start a new game session */
  startSession: (settings: GameSettings, profile?: WinnerProfile) => void;
  /** End the current session (user clicked Back or Play Again) */
  endSession: () => void;
}

export const useTrainingSessionStore = create<TrainingSessionState>()(
  persist(
    (set) => ({
      isGameActive: false,
      gameSettings: null,
      importedProfile: null,
      startSession: (settings, profile) =>
        set({
          isGameActive: true,
          gameSettings: settings,
          importedProfile: profile ?? null,
        }),
      endSession: () =>
        set({
          isGameActive: false,
          gameSettings: null,
          importedProfile: null,
        }),
    }),
    {
      name: "jes-training-session",
      partialize: (state) => ({
        isGameActive: state.isGameActive,
        gameSettings: state.gameSettings,
        importedProfile: state.importedProfile,
      }),
    }
  )
);
