import { Skull, Trophy, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StarDisplay } from "./StarDisplay";
import type { Expert } from "../../types/game";

const personalityColors: Record<string, string> = {
  Scanner: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  Sticky: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  Gambler: "bg-red-500/10 text-red-500 border-red-500/20",
  Analyst: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

interface ExpertRowProps {
  expert: Expert;
  combinationSize: number;
  isCurrentlyGuessing: boolean;
}

export function ExpertRow({
  expert,
  combinationSize,
  isCurrentlyGuessing,
}: ExpertRowProps) {
  const isEliminated = expert.status === "eliminated";
  const isWinner = expert.status === "winner";

  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 rounded-md transition-colors",
        isEliminated && "opacity-50",
        isWinner && "bg-emerald-500/10 ring-1 ring-emerald-500/30",
        isCurrentlyGuessing && !isWinner && "bg-cyan-500/5 ring-1 ring-cyan-500/30",
        !isEliminated && !isWinner && !isCurrentlyGuessing && "hover:bg-muted/50"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Status icon */}
        {isWinner && <Trophy className="h-4 w-4 text-emerald-500 shrink-0" />}
        {isEliminated && <Skull className="h-4 w-4 text-muted-foreground shrink-0" />}
        {isCurrentlyGuessing && !isWinner && !isEliminated && (
          <Loader2 className="h-4 w-4 text-cyan-500 animate-spin shrink-0" />
        )}

        {/* Name */}
        <span
          className={cn(
            "text-sm font-medium truncate",
            isEliminated && "line-through text-muted-foreground",
            isWinner && "text-emerald-500"
          )}
        >
          {expert.name}
        </span>

        {/* Personality badge */}
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0 h-5 shrink-0",
            personalityColors[expert.personality]
          )}
        >
          {expert.personality}
        </Badge>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {isEliminated ? (
          <span className="text-xs text-muted-foreground">
            Eliminated R{expert.eliminatedAtRound}
          </span>
        ) : (
          <>
            <StarDisplay score={expert.currentRoundScore} max={combinationSize} size="sm" />
            <span className="text-xs text-muted-foreground w-12 text-right">
              Best: {expert.currentRoundScore}★
            </span>
          </>
        )}
      </div>
    </div>
  );
}
