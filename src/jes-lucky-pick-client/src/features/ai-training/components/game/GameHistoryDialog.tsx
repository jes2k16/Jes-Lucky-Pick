import { Trophy, Skull, Clock, Cpu, BrainCircuit, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LOTTO_GAMES } from "../../types/game";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NumberBall } from "@/components/shared/NumberBall";
import { StarDisplay } from "./StarDisplay";
import { downloadProfile } from "../../utils/game-export";
import type { GameHistoryEntry } from "../../types/game";

interface GameHistoryDialogProps {
  entry: GameHistoryEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: string) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

const PERSONALITY_COLORS: Record<string, string> = {
  Scanner: "text-cyan-400 border-cyan-400/40",
  Sticky: "text-amber-400 border-amber-400/40",
  Gambler: "text-red-400 border-red-400/40",
  Analyst: "text-emerald-400 border-emerald-400/40",
};

export function GameHistoryDialog({
  entry,
  open,
  onOpenChange,
  onDelete,
}: GameHistoryDialogProps) {
  if (!entry) return null;

  const ResultIcon =
    entry.result === "winner_found"
      ? Trophy
      : entry.result === "all_eliminated"
        ? Skull
        : Clock;

  const resultColor =
    entry.result === "winner_found"
      ? "text-emerald-500"
      : entry.result === "all_eliminated"
        ? "text-destructive"
        : "text-amber-500";

  const resultLabel =
    entry.result === "winner_found"
      ? "Winner Found"
      : entry.result === "all_eliminated"
        ? "All Eliminated"
        : "Time's Up";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[70vw] sm:max-w-none max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ResultIcon className={`h-5 w-5 ${resultColor}`} />
            Game Results
            <Badge variant="outline" className="ml-2 text-xs gap-1">
              {entry.gameMode === "simulation" ? (
                <Cpu className="h-3 w-3" />
              ) : (
                <BrainCircuit className="h-3 w-3" />
              )}
              {entry.gameMode === "simulation" ? "Simulation" : "AI Agent"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Result</p>
              <p className={`text-sm font-semibold ${resultColor}`}>
                {resultLabel}
              </p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-sm font-mono font-semibold">
                {formatDuration(entry.durationSeconds)}
              </p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Rounds</p>
              <p className="text-sm font-mono font-semibold">
                {entry.totalRounds}
              </p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Survivors</p>
              <p className="text-sm font-mono font-semibold">
                {entry.survivingExperts}/{entry.totalExperts}
              </p>
            </div>
          </div>

          {/* Game settings */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-2">Settings</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                {LOTTO_GAMES[entry.settings.lottoGame]?.label ?? `${entry.settings.combinationSize} from ${entry.settings.numberRangeMin}–${entry.settings.numberRangeMax}`}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Managers: {entry.settings.managerCount}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Experts/Mgr: {entry.settings.expertsPerManager}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Time: {entry.settings.timeLimitMinutes}m
              </Badge>
            </div>
          </div>

          {/* Winner card */}
          {entry.winner && (
            <Card className="border-emerald-500/40">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-500">
                    Winner: {entry.winner.expertName}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${PERSONALITY_COLORS[entry.winner.expertPersonality] ?? ""}`}
                  >
                    {entry.winner.expertPersonality}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Secret Combination
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {entry.winner.managerSecretCombination.map((n) => (
                      <NumberBall key={n} number={n} size="sm" />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Rounds</p>
                    <p className="font-mono">{entry.winner.roundsPlayed}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Total Tries</p>
                    <p className="font-mono">{entry.winner.totalTries}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Score</p>
                    <StarDisplay
                      score={entry.winner.winningStars}
                      max={entry.settings.combinationSize}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Winning Guess
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {entry.winner.winningGuess.map((n, i) => (
                      <NumberBall key={i} number={n} size="sm" />
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 w-full"
                    onClick={() => {
                      const profile = entry.winnerProfile ?? {
                        version: 1 as const,
                        exportedAt: entry.playedAt,
                        settings: entry.settings,
                        winner: entry.winner!,
                        confidenceMap: {},
                        personality: entry.winner!.expertPersonality,
                        fullHistory: [],
                      };
                      downloadProfile(profile);
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download Winner Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leaderboard */}
          <div>
            <p className="text-sm font-semibold mb-2">Leaderboard</p>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Expert</TableHead>
                    <TableHead>Personality</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Best</TableHead>
                    <TableHead>Tries</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.leaderboard.map((expert, i) => (
                    <TableRow key={`${expert.expertName}-${i}`}>
                      <TableCell className="font-mono text-muted-foreground text-xs">
                        {i + 1}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {expert.expertName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${PERSONALITY_COLORS[expert.personality] ?? ""}`}
                        >
                          {expert.personality}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {expert.managerLabel}
                      </TableCell>
                      <TableCell>
                        <StarDisplay
                          score={expert.bestScore}
                          max={entry.settings.combinationSize}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {expert.totalTries}
                      </TableCell>
                      <TableCell>
                        {expert.status === "winner" && (
                          <Badge className="bg-emerald-500 text-white text-xs">
                            Winner
                          </Badge>
                        )}
                        {expert.status === "eliminated" && (
                          <span className="text-xs text-muted-foreground">
                            Elim R{expert.eliminatedAtRound}
                          </span>
                        )}
                        {expert.status === "active" && (
                          <span className="text-xs text-muted-foreground">
                            Active
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Delete button */}
          {onDelete && (
            <div className="flex justify-end pt-2">
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => onDelete(entry.id)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Record
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
