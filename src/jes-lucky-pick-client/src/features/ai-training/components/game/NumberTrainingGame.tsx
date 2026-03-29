import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Cpu, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameEngine } from "../../hooks/useGameEngine";
import { useAiGameEngine } from "../../hooks/useAiGameEngine";
import { GameParamsSummary } from "./GameParamsSummary";
import { GameLiveScreen } from "./GameLiveScreen";
import { GameResultsScreen } from "./GameResultsScreen";
import type { GameMode, GameSettings, GameState, WinnerProfile } from "../../types/game";
import type { ExpertRegistry } from "../../types/expert-registry";

interface NumberTrainingGameProps {
  initialSettings: GameSettings;
  initialProfile?: WinnerProfile;
  registry?: ExpertRegistry;
  onBack: () => void;
  onPlayAgain: () => void;
  onGameEnd: (gameState: GameState) => void;
}

export function NumberTrainingGame({
  initialSettings,
  initialProfile,
  registry,
  onBack,
  onPlayAgain,
  onGameEnd,
}: NumberTrainingGameProps) {
  const [activeMode, setActiveMode] = useState<GameMode>(initialSettings.gameMode);
  const savedRef = useRef(false);
  const hasStarted = useRef(false);

  const simEngine = useGameEngine();
  const aiEngine = useAiGameEngine();

  const engine = activeMode === "simulation" ? simEngine : aiEngine;
  const { gameState, pauseGame, resumeGame, resetGame } = engine;

  const isRunning = gameState.phase === "running" || gameState.phase === "paused";

  // Auto-start on mount with the settings from the modal
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      savedRef.current = false;
      setActiveMode(initialSettings.gameMode);
      const target = initialSettings.gameMode === "simulation" ? simEngine : aiEngine;
      target.startGame(initialSettings, initialProfile, registry);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent when game ends
  useEffect(() => {
    if (gameState.phase === "ended" && gameState.result && !savedRef.current) {
      savedRef.current = true;
      onGameEnd(gameState);
    }
    if (gameState.phase === "setup") {
      savedRef.current = false;
    }
  }, [gameState.phase, gameState.result, onGameEnd, gameState]);

  const handleReset = () => {
    resetGame();
    onBack();
  };

  const handleBack = () => {
    if (isRunning) return;
    resetGame();
    onBack();
  };

  const importedProfileName = initialProfile
    ? `${initialProfile.winner.expertName} (${initialProfile.personality})`
    : undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={isRunning}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {isRunning && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            {activeMode === "simulation" ? (
              <Cpu className="h-3.5 w-3.5" />
            ) : (
              <BrainCircuit className="h-3.5 w-3.5" />
            )}
            Game in progress — finish or reset before leaving
          </span>
        )}
      </div>

      {/* Split layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left side — game area (~70%) */}
        <div className="flex-[7] min-w-0 overflow-y-auto">
          {(gameState.phase === "running" || gameState.phase === "paused") && (
            <GameLiveScreen
              gameState={gameState}
              onPause={pauseGame}
              onResume={resumeGame}
              onReset={handleReset}
            />
          )}
          {gameState.phase === "ended" && (
            <GameResultsScreen gameState={gameState} onPlayAgain={onPlayAgain} />
          )}
        </div>

        {/* Right side — params summary (~30%) */}
        <div className="flex-[3] min-w-[220px] max-w-[300px] overflow-y-auto border-l pl-4">
          <GameParamsSummary
            settings={initialSettings}
            importedProfileName={importedProfileName}
          />
        </div>
      </div>
    </div>
  );
}
