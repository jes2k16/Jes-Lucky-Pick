import { useState } from "react";
import { BrainCircuit, Play, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/features/ai-training/hooks/useGameHistory";
import { useExpertRegistry } from "@/features/ai-training/hooks/useExpertRegistry";
import { GameHistoryGrid } from "@/features/ai-training/components/game/GameHistoryGrid";
import { NumberTrainingGame } from "@/features/ai-training/components/game/NumberTrainingGame";
import { GameSetupModal } from "@/features/ai-training/components/game/GameSetupModal";
import { ModeComparisonModal } from "@/features/ai-training/components/game/ModeComparisonModal";
import { useTrainingSessionStore } from "@/stores/trainingSessionStore";
import type { GameSettings, GameState, WinnerProfile } from "@/features/ai-training/types/game";

export function AiTrainingPage() {
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showModeComparison, setShowModeComparison] = useState(false);
  const { isGameActive, gameSettings, importedProfile, startSession, endSession } =
    useTrainingSessionStore();
  const { history, addEntry, deleteEntry } = useGameHistory();
  const { registry, getVeteranCount, updateAfterGame } = useExpertRegistry();

  const handleGameEnd = (gameState: GameState) => {
    addEntry(gameState);
    if (gameSettings) {
      updateAfterGame(gameState, gameSettings.lottoGame, gameSettings.gameMode);
    }
  };

  const handleModalStart = (settings: GameSettings, profile?: WinnerProfile) => {
    startSession(settings, profile);
    setShowSetupModal(false);
  };

  const handleBack = () => {
    endSession();
  };

  const handlePlayAgain = () => {
    endSession();
    setShowSetupModal(true);
  };

  if (isGameActive && gameSettings) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <NumberTrainingGame
          initialSettings={gameSettings}
          initialProfile={importedProfile ?? undefined}
          registry={gameSettings.useVeterans ? registry : undefined}
          onBack={handleBack}
          onPlayAgain={handlePlayAgain}
          onGameEnd={handleGameEnd}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BrainCircuit className="h-6 w-6" />
            Model Training
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Number training game — experts compete to guess secret combinations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModeComparison(true)}
            className="gap-1.5"
          >
            <Info className="h-3.5 w-3.5" />
            How Modes Work
          </Button>
          <Button
            onClick={() => setShowSetupModal(true)}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            New Game
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <GameHistoryGrid
          history={history}
          onDelete={deleteEntry}
        />
      </div>

      <GameSetupModal
        open={showSetupModal}
        onOpenChange={setShowSetupModal}
        onStart={handleModalStart}
        veteranCount={getVeteranCount("6/42")}
      />

      <ModeComparisonModal
        open={showModeComparison}
        onOpenChange={setShowModeComparison}
      />
    </div>
  );
}
