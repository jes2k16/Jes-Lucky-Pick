import { Trophy, Skull, Clock, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { exportWinnerProfile, downloadProfile } from "../../utils/game-export";
import type { GameState, Expert } from "../../types/game";

interface GameResultsScreenProps {
  gameState: GameState;
  onPlayAgain: () => void;
}

export function GameResultsScreen({
  gameState,
  onPlayAgain,
}: GameResultsScreenProps) {
  const { result, winner, managers, settings } = gameState;

  // Build leaderboard: all experts sorted by best-ever single try score
  const allExperts: (Expert & { managerLabel: string })[] = managers.flatMap(
    (m) =>
      m.experts.map((e) => ({
        ...e,
        managerLabel: m.id.toUpperCase(),
      }))
  );

  allExperts.sort((a, b) => {
    const aMax = a.tryHistory.length > 0
      ? Math.max(...a.tryHistory.map((t) => t.stars))
      : 0;
    const bMax = b.tryHistory.length > 0
      ? Math.max(...b.tryHistory.map((t) => t.stars))
      : 0;
    return bMax - aMax;
  });

  const handleDownload = () => {
    const profile = exportWinnerProfile(gameState);
    if (profile) downloadProfile(profile);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 overflow-y-auto">
      {/* Result banner */}
      <div className="text-center space-y-2">
        {result === "winner_found" && (
          <>
            <Trophy className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-bold text-emerald-500">Winner Found!</h2>
          </>
        )}
        {result === "all_eliminated" && (
          <>
            <Skull className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold text-destructive">All Eliminated</h2>
            <p className="text-muted-foreground text-sm">No expert survived. Game over.</p>
          </>
        )}
        {result === "time_up" && (
          <>
            <Clock className="h-12 w-12 text-amber-500 mx-auto" />
            <h2 className="text-2xl font-bold text-amber-500">Time's Up</h2>
            <p className="text-muted-foreground text-sm">
              The time limit was reached before any expert could win.
            </p>
          </>
        )}
      </div>

      {/* Winner card */}
      {winner && (
        <Card className="border-emerald-500/40">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-emerald-500" />
              Winning Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Manager {winner.managerId.toUpperCase()} — Secret Combination
              </p>
              <div className="flex gap-1.5">
                {winner.managerSecretCombination.map((n) => (
                  <NumberBall key={n} number={n} size="md" />
                ))}
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-emerald-500">
                  {winner.expertName}
                </span>
                <Badge variant="outline" className="text-xs">
                  {winner.expertPersonality}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Rounds</p>
                  <p className="font-mono">{winner.roundsPlayed}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Tries</p>
                  <p className="font-mono">{winner.totalTries}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Winning Score</p>
                  <StarDisplay score={winner.winningStars} max={settings.combinationSize} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Winning Guess</p>
                <div className="flex gap-1.5">
                  {winner.winningGuess.map((n, i) => (
                    <NumberBall key={i} number={n} size="sm" />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Expert</TableHead>
                <TableHead>Personality</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Best★</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allExperts.map((expert, i) => {
                const bestScore = expert.tryHistory.length > 0
                  ? Math.max(...expert.tryHistory.map((t) => t.stars))
                  : 0;
                return (
                  <TableRow key={expert.id}>
                    <TableCell className="font-mono text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">{expert.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {expert.personality}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {expert.managerLabel}
                    </TableCell>
                    <TableCell>
                      <StarDisplay score={bestScore} max={settings.combinationSize} size="sm" />
                    </TableCell>
                    <TableCell>
                      {expert.status === "winner" && (
                        <Badge className="bg-emerald-500 text-white text-xs">Winner</Badge>
                      )}
                      {expert.status === "eliminated" && (
                        <span className="text-xs text-muted-foreground">
                          Elim R{expert.eliminatedAtRound}
                        </span>
                      )}
                      {expert.status === "active" && (
                        <span className="text-xs text-muted-foreground">Active</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 pb-4">
        {winner && (
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download Winner Profile
          </Button>
        )}
        <Button onClick={onPlayAgain} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Play Again
        </Button>
      </div>
    </div>
  );
}
