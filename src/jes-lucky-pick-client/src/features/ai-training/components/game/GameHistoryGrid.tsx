import { useState } from "react";
import {
  Trophy,
  Skull,
  Clock,
  Cpu,
  BrainCircuit,
  Trash2,
  History,
} from "lucide-react";
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
import { GameHistoryDialog } from "./GameHistoryDialog";
import type { GameHistoryEntry } from "../../types/game";

interface GameHistoryGridProps {
  history: GameHistoryEntry[];
  onDelete: (id: string) => void;
  onClear: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function GameHistoryGrid({
  history,
  onDelete,
  onClear,
}: GameHistoryGridProps) {
  const [selectedEntry, setSelectedEntry] = useState<GameHistoryEntry | null>(
    null
  );

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No game history yet. Play a game to see results here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Game History
            <Badge variant="secondary" className="text-xs">
              {history.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-destructive gap-1 h-7"
          >
            <Trash2 className="h-3 w-3" />
            Clear All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Winner</TableHead>
                  <TableHead>Rounds</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry, i) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(entry.playedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs gap-1">
                        {entry.gameMode === "simulation" ? (
                          <Cpu className="h-3 w-3" />
                        ) : (
                          <BrainCircuit className="h-3 w-3" />
                        )}
                        {entry.gameMode === "simulation" ? "Sim" : "AI"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {entry.result === "winner_found" && (
                          <>
                            <Trophy className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-xs text-emerald-500">Won</span>
                          </>
                        )}
                        {entry.result === "all_eliminated" && (
                          <>
                            <Skull className="h-3.5 w-3.5 text-destructive" />
                            <span className="text-xs text-destructive">
                              Eliminated
                            </span>
                          </>
                        )}
                        {entry.result === "time_up" && (
                          <>
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-xs text-amber-500">
                              Timeout
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry.winner ? (
                        <span className="font-medium">
                          {entry.winner.expertName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.totalRounds}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatDuration(entry.durationSeconds)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(entry.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <GameHistoryDialog
        entry={selectedEntry}
        open={!!selectedEntry}
        onOpenChange={(open) => {
          if (!open) setSelectedEntry(null);
        }}
      />
    </>
  );
}
