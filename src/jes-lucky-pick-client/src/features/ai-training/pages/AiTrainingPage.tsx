import { useState } from "react";
import { BrainCircuit, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/features/ai-training/hooks/useGameHistory";
import { GameHistoryGrid } from "@/features/ai-training/components/game/GameHistoryGrid";
import { NumberTrainingGame } from "@/features/ai-training/components/game/NumberTrainingGame";
import { GameSetupModal } from "@/features/ai-training/components/game/GameSetupModal";
import type { GameSettings, GameState, WinnerProfile } from "@/features/ai-training/types/game";

export function AiTrainingPage() {
  const [showGame, setShowGame] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [importedProfile, setImportedProfile] = useState<WinnerProfile | null>(null);
  const { history, addEntry, deleteEntry } = useGameHistory();

  const handleGameEnd = (gameState: GameState) => {
    addEntry(gameState);
  };

  const handleModalStart = (settings: GameSettings, profile?: WinnerProfile) => {
    setGameSettings(settings);
    setImportedProfile(profile ?? null);
    setShowSetupModal(false);
    setShowGame(true);
  };

  const handleBack = () => {
    setShowGame(false);
    setGameSettings(null);
    setImportedProfile(null);
  };

  const handlePlayAgain = () => {
    setShowGame(false);
    setGameSettings(null);
    setImportedProfile(null);
    setShowSetupModal(true);
  };

  if (showGame && gameSettings) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <NumberTrainingGame
          initialSettings={gameSettings}
          initialProfile={importedProfile ?? undefined}
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
        <Button
          onClick={() => setShowSetupModal(true)}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          New Game
        </Button>
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
      />
    </div>
  );
}
