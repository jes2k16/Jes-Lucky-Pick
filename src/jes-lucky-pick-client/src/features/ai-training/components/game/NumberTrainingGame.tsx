import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Cpu, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameEngine } from "../../hooks/useGameEngine";
import { useAiGameEngine } from "../../hooks/useAiGameEngine";
import { GameParamsSummary } from "./GameParamsSummary";
import { GameLiveScreen } from "./GameLiveScreen";
import { GameResultsScreen } from "./GameResultsScreen";
import type { GameMode, GameSettings, GameState, GameEngine, WinnerProfile } from "../../types/game";
import type { ExpertRegistry } from "../../types/expert-registry";

const GAME_STATE_KEY = "jes-training-game-state";

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

  // Auto-start on mount — or restore saved game state after a browser refresh
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      savedRef.current = false;

      // Check for saved game state to restore
      const savedJson = localStorage.getItem(GAME_STATE_KEY);
      if (savedJson) {
        try {
          const restored = JSON.parse(savedJson) as GameState;
          if (restored.phase !== "setup") {
            // If the game was already ended before the refresh, mark it as saved
            // so the onGameEnd callback doesn't fire again and duplicate the session.
            if (restored.phase === "ended") {
              savedRef.current = true;
            }
            const mode = restored.settings.gameMode;
            setActiveMode(mode);
            const target: GameEngine = mode === "simulation" ? simEngine : aiEngine;
            target.restoreGame(restored);
            return;
          }
        } catch {
          // Corrupted state — fall through to normal start
        }
      }

      setActiveMode(initialSettings.gameMode);
      const target = initialSettings.gameMode === "simulation" ? simEngine : aiEngine;
      target.startGame(initialSettings, initialProfile, registry);
    }
    return () => {
      // React 18 StrictMode mounts effects twice (mount → cleanup → remount).
      // Ref values are preserved across this cycle, so hasStarted stays true on
      // the second mount and startGame is skipped — leaving the game in a
      // "running" state with a dead worker. Resetting here lets the second mount
      // call startGame fresh with a new worker. Clearing localStorage prevents
      // the second mount from restoring the in-progress state from mount 1.
      hasStarted.current = false;
      localStorage.removeItem(GAME_STATE_KEY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist game state to localStorage so it survives browser refresh
  useEffect(() => {
    if (gameState.phase === "setup") {
      localStorage.removeItem(GAME_STATE_KEY);
      return;
    }
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState));
  }, [gameState]);

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
    localStorage.removeItem(GAME_STATE_KEY);
    onBack();
  };

  const handleBack = () => {
    if (isRunning) return;
    resetGame();
    localStorage.removeItem(GAME_STATE_KEY);
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
