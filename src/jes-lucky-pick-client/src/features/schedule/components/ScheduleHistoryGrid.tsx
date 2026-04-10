import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, ArrowUp, ArrowDown, Play } from "lucide-react";
import { getScheduleHistory, type ScheduleHistoryItem } from "../api/schedule-api";
import { useTrainingSessionStore } from "@/stores/trainingSessionStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ──────────────────────────────────────────────────────────────────

type SortColumn = "date" | "result" | "winner" | "rounds" | "duration";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

// ── Helpers ────────────────────────────────────────────────────────────────

function parseWinnerName(winnerJson: string | null): string {
  if (!winnerJson) return "—";
  try {
    const w = JSON.parse(winnerJson);
    return w.expertName ?? "—";
  } catch {
    return "—";
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ResultBadge({ result }: { result: string }) {
  const map: Record<string, { label: string; className: string }> = {
    winner_found: { label: "Winner", className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" },
    all_eliminated: { label: "Eliminated", className: "bg-destructive/15 text-destructive border-destructive/30" },
    time_up: { label: "Time Up", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  };
  const cfg = map[result] ?? { label: result, className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

function SortIcon({ column, sort }: { column: SortColumn; sort: { col: SortColumn; dir: SortDir } }) {
  if (sort.col !== column) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  return sort.dir === "asc"
    ? <ArrowUp className="h-3.5 w-3.5" />
    : <ArrowDown className="h-3.5 w-3.5" />;
}

function sortItems(items: ScheduleHistoryItem[], col: SortColumn, dir: SortDir): ScheduleHistoryItem[] {
  const sorted = [...items].sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case "date": cmp = new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime(); break;
      case "result": cmp = a.result.localeCompare(b.result); break;
      case "winner": cmp = parseWinnerName(a.winnerJson).localeCompare(parseWinnerName(b.winnerJson)); break;
      case "rounds": cmp = a.totalRounds - b.totalRounds; break;
      case "duration": cmp = a.durationSeconds - b.durationSeconds; break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

// ── Component ──────────────────────────────────────────────────────────────

export function ScheduleHistoryGrid() {
  const navigate = useNavigate();
  const { isGameActive, gameSettings } = useTrainingSessionStore();
  const isScheduledRunning = isGameActive && gameSettings?.gameMode === "scheduled";

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sort, setSort] = useState<{ col: SortColumn; dir: SortDir }>({ col: "date", dir: "desc" });

  const { data, isLoading } = useQuery({
    queryKey: ["schedule-history", page, pageSize],
    queryFn: () => getScheduleHistory(page, pageSize),
  });

  const toggleSort = (col: SortColumn) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" }
    );
  };

  const items = data ? sortItems(data.items, sort.col, sort.dir) : [];
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / pageSize)) : 1;

  const ThBtn = ({ col, label }: { col: SortColumn; label: string }) => (
    <button
      type="button"
      onClick={() => toggleSort(col)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <SortIcon column={col} sort={sort} />
    </button>
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="text-sm font-semibold">Schedule History</h2>

      {/* Running indicator */}
      {isScheduledRunning && (
        <div className="flex items-center justify-between rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">Training in progress</span>
            {gameSettings && (
              <span className="text-xs text-muted-foreground">
                {gameSettings.managerCount} mgr · {gameSettings.expertsPerManager} exp/mgr
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate("/model-training")}>
            <Play className="h-3 w-3" />
            View Live
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium w-36">
                <ThBtn col="date" label="Date" />
              </th>
              <th className="px-3 py-2 text-left font-medium w-24">
                <ThBtn col="result" label="Result" />
              </th>
              <th className="px-3 py-2 text-left font-medium">
                <ThBtn col="winner" label="Winner" />
              </th>
              <th className="px-3 py-2 text-right font-medium w-16">
                <ThBtn col="rounds" label="Rounds" />
              </th>
              <th className="px-3 py-2 text-right font-medium w-20">
                <ThBtn col="duration" label="Duration" />
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-3 py-2"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-8 ml-auto" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-12 ml-auto" /></td>
                </tr>
              ))
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  No scheduled training sessions yet.
                </td>
              </tr>
            )}
            {!isLoading && items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2 text-muted-foreground">{formatDate(item.playedAt)}</td>
                <td className="px-3 py-2"><ResultBadge result={item.result} /></td>
                <td className="px-3 py-2 font-medium">{parseWinnerName(item.winnerJson)}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{item.totalRounds}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{formatDuration(item.durationSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
          >
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data && <span>{data.totalCount} total</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="sm"
            className="h-7 px-2 text-xs"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <span className="px-2">Page {page} of {totalPages}</span>
          <Button
            variant="ghost" size="sm"
            className="h-7 px-2 text-xs"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
