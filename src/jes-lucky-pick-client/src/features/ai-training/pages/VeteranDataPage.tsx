import { useState, useCallback } from "react";
import {
  Star,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useExpertRegistry } from "../hooks/useExpertRegistry";
import { VeteranDetailModal } from "../components/veterans/VeteranDetailModal";
import { formatDate } from "@/lib/format-date";
import type { ExpertPersonality } from "../types/game";
import type { ExpertCareer } from "../types/expert-registry";

// ── Constants ──

const PERSONALITIES: ExpertPersonality[] = [
  "Scanner",
  "Sticky",
  "Gambler",
  "Analyst",
];

const PERSONALITY_COLORS: Record<string, string> = {
  Scanner: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  Sticky: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  Gambler: "bg-red-500/10 text-red-500 border-red-500/20",
  Analyst: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

const PAGE_SIZES = [50, 100, 200, 500, 1000] as const;

// ── Types ──

type SortKey =
  | "name"
  | "personality"
  | "games"
  | "wins"
  | "winRate"
  | "bestScore"
  | "avgScore"
  | "lastPlayed";

type SortDir = "asc" | "desc";

// ── Helpers ──

function getWinRateNum(career: ExpertCareer): number {
  const stats = career.byLottoGame["6/42"];
  if (!stats || stats.gamesPlayed === 0) return 0;
  return Math.round((stats.wins / stats.gamesPlayed) * 100);
}

function getWinRatePct(career: ExpertCareer): string {
  return `${getWinRateNum(career)}%`;
}

function sortCareers(
  careers: ExpertCareer[],
  key: SortKey | null,
  dir: SortDir
): ExpertCareer[] {
  if (!key) return careers;

  return [...careers].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (key) {
      case "name":
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case "personality":
        aVal = a.personality.toLowerCase();
        bVal = b.personality.toLowerCase();
        break;
      case "games":
        aVal = a.byLottoGame["6/42"]?.gamesPlayed ?? 0;
        bVal = b.byLottoGame["6/42"]?.gamesPlayed ?? 0;
        break;
      case "wins":
        aVal = a.byLottoGame["6/42"]?.wins ?? 0;
        bVal = b.byLottoGame["6/42"]?.wins ?? 0;
        break;
      case "winRate":
        aVal = getWinRateNum(a);
        bVal = getWinRateNum(b);
        break;
      case "bestScore":
        aVal = a.bestEverScore;
        bVal = b.bestEverScore;
        break;
      case "avgScore":
        aVal = a.avgRoundScore;
        bVal = b.avgRoundScore;
        break;
      case "lastPlayed":
        aVal = a.lastPlayedAt ?? "";
        bVal = b.lastPlayedAt ?? "";
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return dir === "asc" ? -1 : 1;
    if (aVal > bVal) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

// ── Sort icon component ──

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: SortKey;
  sortKey: SortKey | null;
  sortDir: SortDir;
}) {
  if (sortKey !== col) return null;
  return sortDir === "asc" ? (
    <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-foreground" />
  ) : (
    <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-foreground" />
  );
}

// ── Component ──

export function VeteranDataPage() {
  const { registry, updateCareer, deleteCareer, deduplicateRegistry } = useExpertRegistry();

  // Filters
  const [filterFavorite, setFilterFavorite] = useState<"all" | "favorites">("all");
  const [personalityFilter, setPersonalityFilter] = useState<ExpertPersonality | "all">("all");

  // Sort — default by win rate descending
  const [sortKey, setSortKey] = useState<SortKey | null>("winRate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(50);

  // Modal
  const [selectedCareerId, setSelectedCareerId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Refresh — resets sort & pagination, forces re-read from state
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(() => {
    setSortKey("winRate");
    setSortDir("desc");
    setPage(0);
    setRefreshKey((k) => k + 1);
  }, []);

  // Deduplicate names
  const [dedupeMessage, setDedupeMessage] = useState<string | null>(null);
  const handleDedupe = useCallback(() => {
    const { fixed, names } = deduplicateRegistry();
    if (fixed === 0) {
      setDedupeMessage("No duplicate names found.");
    } else {
      setDedupeMessage(`Fixed ${fixed} duplicate(s): ${names.join(", ")}`);
      handleRefresh();
    }
    setTimeout(() => setDedupeMessage(null), 4000);
  }, [handleRefresh]);

  // Sort header click handler
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  // Data pipeline: filter → sort → paginate
  const veterans = registry.experts.filter(
    (e) => (e.byLottoGame["6/42"]?.gamesPlayed ?? 0) > 0
  );

  const filtered = veterans.filter((e) => {
    if (filterFavorite === "favorites" && !e.isFavorite) return false;
    if (personalityFilter !== "all" && e.personality !== personalityFilter) return false;
    return true;
  });

  const sorted = sortCareers(filtered, sortKey, sortDir);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  function handleStarClick(e: React.MouseEvent, career: ExpertCareer) {
    e.stopPropagation();
    updateCareer(career.id, { isFavorite: !career.isFavorite });
  }

  function handleRowClick(career: ExpertCareer) {
    setSelectedCareerId(career.id);
    setModalOpen(true);
  }

  // Sortable header helper
  function SortableHead({
    col,
    label,
    className,
  }: {
    col: SortKey;
    label: string;
    className?: string;
  }) {
    const isCenter = className?.includes("text-center");
    return (
      <TableHead
        className={className}
        onClick={() => handleSort(col)}
      >
        <button
          type="button"
          className={`flex items-center gap-0 cursor-pointer select-none whitespace-nowrap hover:text-foreground transition-colors w-full${isCenter ? " justify-center" : ""}`}
        >
          {label}
          <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
        </button>
      </TableHead>
    );
  }

  return (
    <div className="space-y-6 p-6" key={refreshKey}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Veteran Data</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Browse and manage your trained expert careers for 6/42.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDedupe}
            className="flex items-center gap-2"
            title="Rename veterans with duplicate names"
          >
            <Wrench className="h-3.5 w-3.5" />
            Fix Duplicates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {dedupeMessage && (
        <p className="text-xs text-muted-foreground">{dedupeMessage}</p>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={filterFavorite === "all" ? "default" : "outline"}
          onClick={() => { setFilterFavorite("all"); setPage(0); }}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={filterFavorite === "favorites" ? "default" : "outline"}
          onClick={() => { setFilterFavorite("favorites"); setPage(0); }}
        >
          <Star className="mr-1 h-3.5 w-3.5" />
          Favorites
        </Button>

        <span className="text-muted-foreground text-sm px-1">|</span>

        <Button
          size="sm"
          variant={personalityFilter === "all" ? "default" : "outline"}
          onClick={() => { setPersonalityFilter("all"); setPage(0); }}
        >
          All
        </Button>
        {PERSONALITIES.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={personalityFilter === p ? "default" : "outline"}
            onClick={() => { setPersonalityFilter(p); setPage(0); }}
          >
            {p}
          </Button>
        ))}
      </div>

      {/* Table */}
      {veterans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">
            No veterans yet. Play some training games first!
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">No veterans match your filters.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(0);
              }}
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Non-sortable: star */}
                  <TableHead className="w-10" />
                  <SortableHead col="name" label="Name" />
                  <SortableHead col="personality" label="Personality" />
                  <SortableHead col="games" label="Games" className="text-center" />
                  <SortableHead col="wins" label="Wins" className="text-center" />
                  <SortableHead col="winRate" label="Win Rate" className="text-center" />
                  <SortableHead col="bestScore" label="Best Score" className="text-center" />
                  <SortableHead col="avgScore" label="Avg Score" className="text-center" />
                  <SortableHead col="lastPlayed" label="Last Played" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((career) => (
                  <TableRow
                    key={career.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(career)}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => handleStarClick(e, career)}
                      >
                        <Star
                          size={15}
                          className={
                            career.isFavorite
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }
                        />
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{career.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={PERSONALITY_COLORS[career.personality]}
                      >
                        {career.personality}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {career.byLottoGame["6/42"]?.gamesPlayed ?? 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {career.byLottoGame["6/42"]?.wins ?? 0}
                    </TableCell>
                    <TableCell className="text-center">{getWinRatePct(career)}</TableCell>
                    <TableCell className="text-center">{career.bestEverScore}★</TableCell>
                    <TableCell className="text-center">
                      {career.avgRoundScore.toFixed(1)}★
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {career.lastPlayedAt ? formatDate(career.lastPlayedAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination footer */}
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

      <VeteranDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        careerId={selectedCareerId}
        onDelete={deleteCareer}
      />
    </div>
  );
}
