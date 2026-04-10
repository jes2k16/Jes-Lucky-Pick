import { Pause, Play, RotateCcw, Cpu, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ManagerCard } from "./ManagerCard";
import { ActivityLog } from "./ActivityLog";
import { LOTTO_GAMES } from "../../types/game";
import type { GameState } from "../../types/game";

interface GameLiveScreenProps {
  gameState: GameState;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GameLiveScreen({
  gameState,
  onPause,
  onResume,
  onReset,
}: GameLiveScreenProps) {
  const { settings, managers, currentRound, currentTry, timeRemaining, log, phase } =
    gameState;

  const isPaused = phase === "paused";
  const totalExperts = managers.flatMap((m) => m.experts).length;
  const activeExperts = managers
    .flatMap((m) => m.experts)
    .filter((e) => e.status === "active").length;

  const timePercent =
    (timeRemaining / (settings.timeLimitMinutes * 60)) * 100;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono">
            Round {currentRound}
          </Badge>
          <Badge variant="outline" className="font-mono">
            Try {currentTry}/6
          </Badge>
          <Badge variant="outline" className="font-mono">
            {activeExperts}/{totalExperts} alive
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Timer */}
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  timePercent < 20 ? "bg-red-500" : timePercent < 50 ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${timePercent}%` }}
              />
            </div>
            <span
              className={`font-mono text-sm tabular-nums ${
                timeRemaining < 30 ? "text-red-500" : "text-muted-foreground"
              }`}
            >
              {formatTime(timeRemaining)}
            </span>
          </div>

          {/* Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={isPaused ? onResume : onPause}
            className="gap-1.5 text-foreground"
          >
            {isPaused ? (
              <>
                <Play className="h-3.5 w-3.5" /> Resume
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="gap-1.5 text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      {/* Game mode banner */}
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2 text-sm">
        <Badge
          variant={settings.gameMode === "ai-agent" ? "default" : "secondary"}
          className="gap-1.5"
        >
          {settings.gameMode === "ai-agent" ? (
            <BrainCircuit className="h-3.5 w-3.5" />
          ) : (
            <Cpu className="h-3.5 w-3.5" />
          )}
          {settings.gameMode === "ai-agent" ? "AI Agent" : "Simulation"}
        </Badge>
        <span className="text-muted-foreground">|</span>
        <span className="font-medium text-foreground">
          {LOTTO_GAMES[settings.lottoGame]?.label ?? `${settings.combinationSize} from ${settings.numberRangeMin}-${settings.numberRangeMax}`}
        </span>
        {settings.gameMode === "ai-agent" && (
          <>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground text-xs">{settings.model}</span>
          </>
        )}
      </div>

      {/* Manager grid */}
      <div className={cn(
        "min-h-0 overflow-y-auto",
        managers.length <= 2 ? "flex-1" : "flex-[2]"
      )}>
        <div
          className={`grid gap-4 ${
            managers.length === 1
              ? "grid-cols-1"
              : managers.length === 2
                ? "grid-cols-1 lg:grid-cols-2"
                : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
          }`}
        >
          {managers.map((manager) => (
            <ManagerCard
              key={manager.id}
              manager={manager}
              combinationSize={settings.combinationSize}
              currentExpertId={gameState.currentExpertId}
            />
          ))}
        </div>
      </div>

      {/* Activity log */}
      <ActivityLog
        entries={log}
        className={cn(
          "min-h-32",
          managers.length <= 2 ? "flex-1" : "flex-1 min-h-40"
        )}
      />
    </div>
  );
}
