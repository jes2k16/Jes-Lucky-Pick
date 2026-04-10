import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDraws,
  fetchLatestResults,
  createDraw,
} from "@/features/history/api/drawsApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NumberBall } from "@/components/shared/NumberBall";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, RefreshCw, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { formatDate } from "@/lib/format-date";

export function HistoryPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [filterDay, setFilterDay] = useState("all");
  const [sortKey, setSortKey] = useState<"date" | "jackpot" | "winners" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fetchMessage, setFetchMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualNumbers, setManualNumbers] = useState(["", "", "", "", "", ""]);
  const [manualJackpot, setManualJackpot] = useState("");
  const [manualWinners, setManualWinners] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["draws", page, pageSize, fromDate, toDate],
    queryFn: () =>
      fetchDraws({
        page,
        pageSize,
        from: fromDate || undefined,
        to: toDate || undefined,
      }),
  });

  const fetchMutation = useMutation({
    mutationFn: () => fetchLatestResults(),
    onSuccess: (result) => {
      setFetchMessage({ text: result.message, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["draws"] });
    },
    onError: () => {
      setFetchMessage({
        text: "Failed to fetch results from PCSO. Try manual entry.",
        type: "error",
      });
    },
  });

  const manualMutation = useMutation({
    mutationFn: () =>
      createDraw({
        gameCode: "6_42",
        drawDate: manualDate,
        numbers: manualNumbers.map(Number),
        jackpotAmount: manualJackpot ? Number(manualJackpot) : null,
        winnersCount: manualWinners ? Number(manualWinners) : null,
      }),
    onSuccess: () => {
      setManualOpen(false);
      setManualDate("");
      setManualNumbers(["", "", "", "", "", ""]);
      setManualJackpot("");
      setManualWinners("");
      setFetchMessage({ text: "Draw added successfully.", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["draws"] });
    },
    onError: () => {
      setFetchMessage({
        text: "Failed to add draw. Check your input.",
        type: "error",
      });
    },
  });

  const totalPages = data ? Math.ceil(data.totalCount / pageSize) : 0;

  function handleSort(key: "date" | "jackpot" | "winners") {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ col }: { col: "date" | "jackpot" | "winners" }) {
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
    col: "date" | "jackpot" | "winners";
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

  const uniqueDays = ["all", ...Array.from(new Set((data?.items ?? []).map((d) => d.dayOfWeek))).sort()];

  const filteredItems = (data?.items ?? []).filter(
    (d) => filterDay === "all" || d.dayOfWeek === filterDay
  );
  const sortedItems = sortKey
    ? [...filteredItems].sort((a, b) => {
        switch (sortKey) {
          case "date":
            return sortDir === "asc"
              ? a.drawDate.localeCompare(b.drawDate)
              : b.drawDate.localeCompare(a.drawDate);
          case "jackpot": {
            const aJ = a.jackpotAmount ?? 0;
            const bJ = b.jackpotAmount ?? 0;
            return sortDir === "asc" ? aJ - bJ : bJ - aJ;
          }
          case "winners": {
            const aW = a.winnersCount ?? 0;
            const bW = b.winnersCount ?? 0;
            return sortDir === "asc" ? aW - bW : bW - aW;
          }
          default:
            return 0;
        }
      })
    : filteredItems;

  const isManualValid =
    manualDate &&
    manualNumbers.every((n) => {
      const num = Number(n);
      return n && Number.isInteger(num) && num >= 1 && num <= 42;
    }) &&
    new Set(manualNumbers.map(Number)).size === 6;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Draw History</h2>
        <p className="text-sm text-muted-foreground">
          Browse past PCSO 6/42 draw results
        </p>
      </div>

      {/* Filters + Fetch Button */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="w-auto dark:[color-scheme:dark]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="w-auto dark:[color-scheme:dark]"
          />
        </div>
        {(fromDate || toDate) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
          >
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}

        {uniqueDays.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">Day:</span>
            {uniqueDays.map((day) => (
              <Button
                key={day}
                size="sm"
                variant={filterDay === day ? "default" : "outline"}
                onClick={() => setFilterDay(day)}
              >
                {day === "all" ? "All" : day}
              </Button>
            ))}
          </div>
        )}

        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFetchMessage(null);
              fetchMutation.mutate();
            }}
            disabled={fetchMutation.isPending}
          >
            <RefreshCw
              className={`mr-1 h-3 w-3 ${fetchMutation.isPending ? "animate-spin" : ""}`}
            />
            {fetchMutation.isPending ? "Fetching..." : "Fetch Latest Results"}
          </Button>

          <Dialog open={manualOpen} onOpenChange={setManualOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Draw Result</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Draw Date</Label>
                  <Input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="dark:[color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Numbers (1-42)</Label>
                  <div className="flex gap-2">
                    {manualNumbers.map((n, i) => (
                      <Input
                        key={i}
                        type="number"
                        min={1}
                        max={42}
                        value={n}
                        onChange={(e) => {
                          const updated = [...manualNumbers];
                          updated[i] = e.target.value;
                          setManualNumbers(updated);
                        }}
                        className="w-16 text-center"
                        placeholder={`#${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <Label>Jackpot (optional)</Label>
                    <Input
                      type="number"
                      value={manualJackpot}
                      onChange={(e) => setManualJackpot(e.target.value)}
                      placeholder="e.g., 10000000"
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label>Winners</Label>
                    <Input
                      type="number"
                      value={manualWinners}
                      onChange={(e) => setManualWinners(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => manualMutation.mutate()}
                  disabled={!isManualValid || manualMutation.isPending}
                >
                  {manualMutation.isPending ? "Adding..." : "Add Draw"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Fetch message */}
      {fetchMessage && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            fetchMessage.type === "success"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
              : "border-destructive/20 bg-destructive/10 text-destructive"
          }`}
        >
          {fetchMessage.text}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Results
            {data && (
              <span className="ml-2 font-normal text-muted-foreground">
                ({data.totalCount.toLocaleString()} draws)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[100, 200, 500, 1000].map((s) => (
                      <SelectItem key={s} value={String(s)} className="text-xs">
                        {s} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead col="date" label="Date" />
                    <TableHead>Day</TableHead>
                    <TableHead>Numbers</TableHead>
                    <SortableHead col="jackpot" label="Jackpot" className="text-right" />
                    <SortableHead col="winners" label="Winners" className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((draw) => (
                    <TableRow key={draw.id}>
                      <TableCell className="text-sm font-medium">
                        {formatDate(draw.drawDate)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {draw.dayOfWeek}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {draw.numbers.map((num, i) => (
                            <NumberBall key={i} number={num} size="sm" />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-green-600">
                        {draw.jackpotAmount
                          ? `₱${draw.jackpotAmount.toLocaleString()}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {draw.winnersCount ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-end gap-2">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
