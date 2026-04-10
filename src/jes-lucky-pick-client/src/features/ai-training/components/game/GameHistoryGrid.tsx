import { useState } from "react";
import {
  Trophy,
  Skull,
  Clock,
  Cpu,
  BrainCircuit,
  CalendarClock,
  History,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}

const PAGE_SIZES = [100, 200, 500, 1000] as const;

type SortKey = "date" | "mode" | "result" | "winner" | "rounds" | "duration";
type SortDir = "asc" | "desc";

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
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function sortEntries(
  entries: GameHistoryEntry[],
  key: SortKey | null,
  dir: SortDir
): GameHistoryEntry[] {
  if (!key) return entries;
  return [...entries].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;
    switch (key) {
      case "date":
        aVal = a.playedAt;
        bVal = b.playedAt;
        break;
      case "mode":
        aVal = a.gameMode;
        bVal = b.gameMode;
        break;
      case "result":
        aVal = a.result;
        bVal = b.result;
        break;
      case "winner":
        aVal = a.winner?.expertName ?? "";
        bVal = b.winner?.expertName ?? "";
        break;
      case "rounds":
        aVal = a.totalRounds;
        bVal = b.totalRounds;
        break;
      case "duration":
        aVal = a.durationSeconds;
        bVal = b.durationSeconds;
        break;
      default:
        return 0;
    }
    if (aVal < bVal) return dir === "asc" ? -1 : 1;
    if (aVal > bVal) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

export function GameHistoryGrid({ history, onDelete }: GameHistoryGridProps) {
  const [selectedEntry, setSelectedEntry] = useState<GameHistoryEntry | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(100);
  const [filterMode, setFilterMode] = useState<"all" | "simulation" | "ai-agent" | "scheduled">("all");
  const [filterResult, setFilterResult] = useState<
    "all" | "winner_found" | "all_eliminated" | "time_up" | "interrupted"
  >("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-foreground" />
    );
  }

  function SortableHead({
    col,
    label,
    className,
  }: {
    col: SortKey;
    label: string;
    className?: string;
  }) {
    return (
      <TableHead className={className} onClick={() => handleSort(col)}>
        <button
          type="button"
          className="flex items-center gap-0 cursor-pointer select-none whitespace-nowrap hover:text-foreground transition-colors w-full"
        >
          {label}
          <SortIcon col={col} />
        </button>
      </TableHead>
    );
  }

  const filtered = history.filter((e) => {
    if (filterMode !== "all" && e.gameMode !== filterMode) return false;
    if (filterResult !== "all" && e.result !== filterResult) return false;
    return true;
  });

  const sorted = sortEntries(filtered, sortKey, sortDir);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

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

  const handleDelete = (id: string) => {
    onDelete(id);
    setSelectedEntry(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Game History
            <Badge variant="secondary" className="text-xs">
              {history.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={filterMode === "all" ? "default" : "outline"}
              onClick={() => { setFilterMode("all"); setPage(0); }}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filterMode === "simulation" ? "default" : "outline"}
              onClick={() => { setFilterMode("simulation"); setPage(0); }}
            >
              <Cpu className="mr-1 h-3 w-3" />
              Simulation
            </Button>
            <Button
              size="sm"
              variant={filterMode === "ai-agent" ? "default" : "outline"}
              onClick={() => { setFilterMode("ai-agent"); setPage(0); }}
            >
              <BrainCircuit className="mr-1 h-3 w-3" />
              AI Agent
            </Button>
            <Button
              size="sm"
              variant={filterMode === "scheduled" ? "default" : "outline"}
              onClick={() => { setFilterMode("scheduled"); setPage(0); }}
            >
              <CalendarClock className="mr-1 h-3 w-3" />
              Scheduled
            </Button>

            <span className="text-muted-foreground text-sm px-1">|</span>

            <Button
              size="sm"
              variant={filterResult === "all" ? "default" : "outline"}
              onClick={() => { setFilterResult("all"); setPage(0); }}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filterResult === "winner_found" ? "default" : "outline"}
              onClick={() => { setFilterResult("winner_found"); setPage(0); }}
            >
              <Trophy className="mr-1 h-3 w-3" />
              Won
            </Button>
            <Button
              size="sm"
              variant={filterResult === "all_eliminated" ? "default" : "outline"}
              onClick={() => { setFilterResult("all_eliminated"); setPage(0); }}
            >
              <Skull className="mr-1 h-3 w-3" />
              Eliminated
            </Button>
            <Button
              size="sm"
              variant={filterResult === "time_up" ? "default" : "outline"}
              onClick={() => { setFilterResult("time_up"); setPage(0); }}
            >
              <Clock className="mr-1 h-3 w-3" />
              Timeout
            </Button>
            <Button
              size="sm"
              variant={filterResult === "interrupted" ? "default" : "outline"}
              onClick={() => { setFilterResult("interrupted"); setPage(0); }}
            >
              <Unplug className="mr-1 h-3 w-3" />
              Interrupted
            </Button>
          </div>

          <div className="flex justify-end">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}
            >
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sorted.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No games match your filters.
            </p>
          ) : (
            <>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <SortableHead col="date" label="Date" />
                      <SortableHead col="mode" label="Mode" />
                      <SortableHead col="result" label="Result" />
                      <SortableHead col="winner" label="Winner" />
                      <SortableHead col="rounds" label="Rounds" />
                      <SortableHead col="duration" label="Duration" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((entry, i) => (
                      <TableRow
                        key={entry.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {safePage * pageSize + i + 1}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(entry.playedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs gap-1">
                            {entry.gameMode === "simulation" && <Cpu className="h-3 w-3" />}
                            {entry.gameMode === "ai-agent" && <BrainCircuit className="h-3 w-3" />}
                            {entry.gameMode === "scheduled" && <CalendarClock className="h-3 w-3" />}
                            {entry.gameMode === "simulation" && "Sim"}
                            {entry.gameMode === "ai-agent" && "AI"}
                            {entry.gameMode === "scheduled" && "Sched"}
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
                                <span className="text-xs text-destructive">Eliminated</span>
                              </>
                            )}
                            {entry.result === "time_up" && (
                              <>
                                <Clock className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-xs text-amber-500">Timeout</span>
                              </>
                            )}
                            {entry.result === "interrupted" && (
                              <>
                                <Unplug className="h-3.5 w-3.5 text-orange-500" />
                                <span className="text-xs text-orange-500">Interrupted</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {entry.winner ? (
                            <span className="font-medium">{entry.winner.expertName}</span>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs text-muted-foreground">
                  {sorted.length} total · Page {safePage + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={safePage === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={safePage >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <GameHistoryDialog
        entry={selectedEntry}
        open={!!selectedEntry}
        onOpenChange={(open) => {
          if (!open) setSelectedEntry(null);
        }}
        onDelete={handleDelete}
      />
    </>
  );
}
