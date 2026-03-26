import { useState, useEffect, useRef } from "react";
import { useGameEngine } from "../../hooks/useGameEngine";
import { useAiGameEngine } from "../../hooks/useAiGameEngine";
import { useGameHistory } from "../../hooks/useGameHistory";
import { GameSetupScreen } from "./GameSetupScreen";
import { GameLiveScreen } from "./GameLiveScreen";
import { GameResultsScreen } from "./GameResultsScreen";
import { GameHistoryGrid } from "./GameHistoryGrid";
import type { GameMode, GameSettings, WinnerProfile } from "../../types/game";

export function NumberTrainingGame() {
  const [activeMode, setActiveMode] = useState<GameMode>("simulation");
  const { history, addEntry, deleteEntry, clearHistory } = useGameHistory();
  const savedRef = useRef(false);

  const simEngine = useGameEngine();
  const aiEngine = useAiGameEngine();

  const engine = activeMode === "simulation" ? simEngine : aiEngine;
  const { gameState, pauseGame, resumeGame, resetGame } = engine;

  // Save to history when game ends
  useEffect(() => {
    if (gameState.phase === "ended" && gameState.result && !savedRef.current) {
      savedRef.current = true;
      addEntry(gameState);
    }
    if (gameState.phase === "setup") {
      savedRef.current = false;
    }
  }, [gameState.phase, gameState.result, addEntry, gameState]);

  const handleStart = (settings: GameSettings, profile?: WinnerProfile) => {
    savedRef.current = false;
    setActiveMode(settings.gameMode);
    const target = settings.gameMode === "simulation" ? simEngine : aiEngine;
    target.startGame(settings, profile);
  };

  const handleReset = () => {
    resetGame();
  };

  switch (gameState.phase) {
    case "setup":
      return (
        <div className="space-y-6">
          <GameSetupScreen onStart={handleStart} />
          <GameHistoryGrid
            history={history}
            onDelete={deleteEntry}
            onClear={clearHistory}
          />
        </div>
      );
    case "running":
    case "paused":
      return (
        <GameLiveScreen
          gameState={gameState}
          onPause={pauseGame}
          onResume={resumeGame}
          onReset={handleReset}
        />
      );
    case "ended":
      return (
        <GameResultsScreen gameState={gameState} onPlayAgain={handleReset} />
      );
  }
}
