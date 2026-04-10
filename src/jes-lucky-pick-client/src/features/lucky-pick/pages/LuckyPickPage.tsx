import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generatePrediction,
  savePrediction,
  generateAgentPrediction,
  fetchPredictionHistory,
  fetchDrawContext,
} from "@/features/lucky-pick/api/predictionApi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NumberBall } from "@/components/shared/NumberBall";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sparkles, History, Trophy, Clock, ChevronsUpDown, Check, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { useExpertRegistry } from "@/features/ai-training/hooks/useExpertRegistry";
import {
  buildSeededConfidenceMap,
  buildCareerContext,
} from "@/features/ai-training/hooks/useExpertRegistry";
import { executeStrategy } from "@/features/ai-training/utils/strategies";
import type { GameScheduleDto, PredictionResponse } from "@/types/api";
import type {
  ExpertPersonality,
  GameSettings,
  Expert,
} from "@/features/ai-training/types/game";
import type { ExpertCareer, ExpertRegistry } from "@/features/ai-training/types/expert-registry";

// ── Types ──

type PickMethod = "standard" | "simulation" | "agent";

// ── Constants ──

const strategies = [
  { value: "combined", label: "Combined (All Strategies)" },
  { value: "frequency", label: "Frequency Analysis" },
  { value: "hotcold", label: "Hot & Cold Numbers" },
  { value: "gap", label: "Gap Analysis (Due Numbers)" },
];

const AI_MODELS = [
  { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
  { value: "claude-sonnet-4-6", label: "Sonnet 4.6" },
  { value: "claude-opus-4-6", label: "Opus 4.6" },
];

const MINIMAL_SETTINGS: GameSettings = {
  lottoGame: "6/42",
  numberRangeMin: 1,
  numberRangeMax: 42,
  combinationSize: 6,
  managerCount: 1,
  expertsPerManager: 1,
  timeLimitMinutes: 5,
  simulationSpeedMs: 500,
  gameMode: "simulation",
  concurrencyMode: "fully-parallel",
  model: "claude-haiku-4-5-20251001",
  useVeterans: false,
};

// ── Helpers ──

function extractModelName(reasoning: string): string | null {
  const match = reasoning.match(/^\[Model: (.+?)\]\s*/);
  return match ? match[1] : null;
}

function stripModelPrefix(reasoning: string): string {
  return reasoning.replace(/^\[Model: .+?\]\s*/, "");
}

function extractPersonality(reasoning: string): string | null {
  return reasoning.match(/\[Personality: (.+?)\]/)?.[1] ?? null;
}

function getWinRatePct(career: ExpertCareer): number {
  const stats = career.byLottoGame["6/42"];
  if (!stats || stats.gamesPlayed === 0) return 0;
  return Math.round((stats.wins / stats.gamesPlayed) * 100);
}

function resolveVeteranCareer(
  registry: ExpertRegistry,
  selectedVeteranId: string | "none" | "auto"
): ExpertCareer | null {
  if (selectedVeteranId === "none") return null;
  const candidates = registry.experts.filter(
    (e) => (e.byLottoGame["6/42"]?.gamesPlayed ?? 0) > 0
  );
  if (!candidates.length) return null;
  if (selectedVeteranId === "auto") {
    return candidates.sort(
      (a, b) =>
        (b.byLottoGame["6/42"]?.gamesPlayed ?? 0) -
        (a.byLottoGame["6/42"]?.gamesPlayed ?? 0)
    )[0];
  }
  return candidates.find((e) => e.id === selectedVeteranId) ?? null;
}

const dayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function useCountdown(
  schedule: GameScheduleDto | undefined,
  drawTimeIso: string | undefined
) {
  const [timeLeft, setTimeLeft] = useState("");
  const [nextDrawDate, setNextDrawDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!schedule || !drawTimeIso) return;

    const drawDays = schedule.drawDays.split(",").map((d) => dayMap[d.trim()]);
    const drawTime = new Date(drawTimeIso);
    const hours = drawTime.getUTCHours();
    const minutes = drawTime.getUTCMinutes();

    function getNextDraw(): Date {
      const now = new Date();
      for (let offset = 0; offset <= 7; offset++) {
        const candidate = new Date(now);
        candidate.setUTCDate(candidate.getUTCDate() + offset);
        candidate.setUTCHours(hours, minutes, 0, 0);
        if (drawDays.includes(candidate.getUTCDay()) && candidate > now) {
          return candidate;
        }
      }
      return new Date();
    }

    const tick = () => {
      const next = getNextDraw();
      setNextDrawDate(next);
      const diff = next.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Drawing now!");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [schedule, drawTimeIso]);

  return { timeLeft, nextDrawDate };
}

// ── Component ──

export function LuckyPickPage() {
  const [method, setMethod] = useState<PickMethod>("standard");
  const [strategy, setStrategy] = useState("combined");
  const [count, setCount] = useState(1);
  const [aiModel, setAiModel] = useState("claude-haiku-4-5-20251001");
  const [selectedVeteranId, setSelectedVeteranId] = useState<
    string | "none" | "auto"
  >("auto");
  const [veteranPopoverOpen, setVeteranPopoverOpen] = useState(false);
  const [results, setResults] = useState<PredictionResponse[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(100);
  const [historyFilterStrategy, setHistoryFilterStrategy] = useState("all");
  const [historySortKey, setHistorySortKey] = useState<
    "date" | "strategy" | "confidence" | "match" | null
  >(null);
  const [historySortDir, setHistorySortDir] = useState<"asc" | "desc">("asc");

  function handleHistorySort(key: "date" | "strategy" | "confidence" | "match") {
    if (historySortKey === key) {
      setHistorySortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setHistorySortKey(key);
      setHistorySortDir("asc");
    }
  }

  function HistorySortIcon({ col }: { col: "date" | "strategy" | "confidence" | "match" }) {
    if (historySortKey !== col) return null;
    return historySortDir === "asc" ? (
      <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-foreground" />
    );
  }

  function HistorySortableHead({
    col,
    label,
    className,
  }: {
    col: "date" | "strategy" | "confidence" | "match";
    label: string;
    className?: string;
  }) {
    return (
      <TableHead className={className} onClick={() => handleHistorySort(col)}>
        <button
          type="button"
          className="flex items-center gap-0 cursor-pointer select-none whitespace-nowrap hover:text-foreground transition-colors w-full"
        >
          {label}
          <HistorySortIcon col={col} />
        </button>
      </TableHead>
    );
  }

  const queryClient = useQueryClient();

  const { registry } = useExpertRegistry();

  // Veteran dropdown data — all personalities
  const allVets = registry.experts.filter(
    (e) => (e.byLottoGame["6/42"]?.gamesPlayed ?? 0) > 0
  );
  const favVets = allVets
    .filter((e) => e.isFavorite)
    .sort((a, b) => getWinRatePct(b) - getWinRatePct(a));
  const otherVets = allVets
    .filter((e) => !e.isFavorite)
    .sort(
      (a, b) =>
        (b.byLottoGame["6/42"]?.gamesPlayed ?? 0) -
        (a.byLottoGame["6/42"]?.gamesPlayed ?? 0)
    );

  const resolvedVeteran = resolveVeteranCareer(registry, selectedVeteranId);

  // Personality is derived from the selected veteran (fallback: Scanner)
  const effectivePersonality: ExpertPersonality =
    resolvedVeteran?.personality ?? "Scanner";

  const { data: context, isLoading: contextLoading } = useQuery({
    queryKey: ["draws", "context"],
    queryFn: fetchDrawContext,
  });

  const countdown = useCountdown(
    context?.schedule,
    context?.lastDraw?.drawDate
  );

  // Standard mutation
  const strategyMutation = useMutation({
    mutationFn: () =>
      generatePrediction({ gameCode: "6_42", strategy, count }),
    onSuccess: (data) => {
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
    },
  });

  // Simulation mutation (client-side generation, then save)
  const simulationMutation = useMutation({
    mutationFn: async () => {
      const veteran = resolveVeteranCareer(registry, selectedVeteranId);
      const personality = veteran?.personality ?? "Scanner";
      const confidenceMap = veteran
        ? buildSeededConfidenceMap(veteran, "6/42", MINIMAL_SETTINGS)
        : Object.fromEntries(
            Array.from({ length: 42 }, (_, i) => [i + 1, 0.5])
          );

      const expert: Expert = {
        id: "lp",
        name: "LuckyPick",
        managerId: "",
        personality,
        status: "active",
        confidenceMap,
        tryHistory: [],
        roundHistory: [],
        roundScores: [],
        eliminatedAtRound: null,
        currentRoundScore: 0,
      };

      const sets = Array.from({ length: count }, () =>
        executeStrategy(expert, MINIMAL_SETTINGS, 1)
      );

      const avgConfidence =
        sets[0]
          .map((n) => confidenceMap[n] ?? 0.5)
          .reduce((s, v) => s + v, 0) /
        sets[0].length;
      const confidenceScore = Math.round(
        Math.min(100, Math.max(0, avgConfidence * 100))
      );

      const veteranNote =
        veteran
          ? `[Veteran: ${veteran.byLottoGame["6/42"]?.gamesPlayed ?? 0} games, ${getWinRatePct(veteran)}% WR]`
          : "";
      const reasoning = `[Personality: ${personality}]${veteranNote ? " " + veteranNote : ""} Simulation-generated pick using ${personality} strategy.`;

      const savedSets = await Promise.all(
        sets.map((numbers) =>
          savePrediction({
            gameCode: "6_42",
            numbers,
            strategy: "SimulationExpert",
            confidenceScore,
            reasoning,
          })
        )
      );

      return savedSets.flat();
    },
    onSuccess: (data) => {
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
    },
  });

  // AI Agent mutation
  const agentMutation = useMutation({
    mutationFn: async () => {
      const veteran = resolveVeteranCareer(registry, selectedVeteranId);
      const personality = veteran?.personality ?? "Scanner";
      const confidenceMap = veteran
        ? buildSeededConfidenceMap(veteran, "6/42", MINIMAL_SETTINGS)
        : Object.fromEntries(
            Array.from({ length: 42 }, (_, i) => [i + 1, 0.5])
          );
      const careerContext = veteran
        ? buildCareerContext(veteran, "6/42") ?? ""
        : "";

      return generateAgentPrediction({
        gameCode: "6_42",
        personality,
        model: aiModel,
        count,
        confidenceMapJson: JSON.stringify(confidenceMap),
        careerContextJson: careerContext,
      });
    },
    onSuccess: (data) => {
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
    },
  });

  const activeMutation =
    method === "standard"
      ? strategyMutation
      : method === "simulation"
        ? simulationMutation
        : agentMutation;

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["predictions", historyPage],
    queryFn: () =>
      fetchPredictionHistory({ page: historyPage, pageSize: historyPageSize }),
  });

  const totalHistoryPages = history
    ? Math.ceil(history.totalCount / historyPageSize)
    : 0;

  const uniqueStrategies = [
    "all",
    ...Array.from(new Set((history?.items ?? []).map((i) => i.strategy))).sort(),
  ];
  const historyFilteredItems = (history?.items ?? []).filter(
    (item) => historyFilterStrategy === "all" || item.strategy === historyFilterStrategy
  );
  const historySortedItems = historySortKey
    ? [...historyFilteredItems].sort((a, b) => {
        switch (historySortKey) {
          case "date":
            return historySortDir === "asc"
              ? a.createdAt.localeCompare(b.createdAt)
              : b.createdAt.localeCompare(a.createdAt);
          case "strategy":
            return historySortDir === "asc"
              ? a.strategy.localeCompare(b.strategy)
              : b.strategy.localeCompare(a.strategy);
          case "confidence":
            return historySortDir === "asc"
              ? a.confidenceScore - b.confidenceScore
              : b.confidenceScore - a.confidenceScore;
          case "match": {
            const aM = a.matchInfo?.matchedCount ?? -1;
            const bM = b.matchInfo?.matchedCount ?? -1;
            return historySortDir === "asc" ? aM - bM : bM - aM;
          }
          default:
            return 0;
        }
      })
    : historyFilteredItems;

  function handleGenerate() {
    activeMutation.mutate();
  }

  // ── Veteran Combobox ──

  function veteranCombobox() {
    const displayLabel =
      selectedVeteranId === "auto"
        ? "Auto (Best veteran)"
        : selectedVeteranId === "none"
          ? "None (Fresh map)"
          : resolvedVeteran
            ? `${resolvedVeteran.isFavorite ? "⭐ " : ""}${resolvedVeteran.name} (${resolvedVeteran.personality})`
            : "Select veteran...";

    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Veteran Expert</Label>
        <Popover open={veteranPopoverOpen} onOpenChange={setVeteranPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={veteranPopoverOpen}
              className="w-[420px] justify-between font-normal"
            >
              <span className="truncate">{displayLabel}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0">
            <Command>
              <CommandInput placeholder="Search veteran..." />
              <CommandList>
                <CommandEmpty>No veteran found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="auto"
                    onSelect={() => {
                      setSelectedVeteranId("auto");
                      setVeteranPopoverOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedVeteranId === "auto" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Auto (Best veteran)
                  </CommandItem>
                </CommandGroup>

                {favVets.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Favorites">
                      {favVets.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.name} ${c.personality} favorite`}
                          onSelect={() => {
                            setSelectedVeteranId(c.id);
                            setVeteranPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedVeteranId === c.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          ⭐ {c.name} ({c.personality}) —{" "}
                          {c.byLottoGame["6/42"]?.gamesPlayed ?? 0} games,{" "}
                          {getWinRatePct(c)}% WR
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}

                {otherVets.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="All Veterans">
                      {otherVets.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.name} ${c.personality}`}
                          onSelect={() => {
                            setSelectedVeteranId(c.id);
                            setVeteranPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedVeteranId === c.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {c.name} ({c.personality}) —{" "}
                          {c.byLottoGame["6/42"]?.gamesPlayed ?? 0} games,{" "}
                          {getWinRatePct(c)}% WR
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}

                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="none"
                    onSelect={() => {
                      setSelectedVeteranId("none");
                      setVeteranPopoverOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedVeteranId === "none" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    None (Fresh map)
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {allVets.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No veteran data for {effectivePersonality} — using fresh confidence map.
          </p>
        )}

        {selectedVeteranId !== "auto" &&
          selectedVeteranId !== "none" &&
          resolvedVeteran && (
            <p className="text-xs text-muted-foreground">
              {resolvedVeteran.name}:{" "}
              {resolvedVeteran.byLottoGame["6/42"]?.gamesPlayed ?? 0} games,{" "}
              {getWinRatePct(resolvedVeteran)}% WR, best{" "}
              {resolvedVeteran.bestEverScore}★
            </p>
          )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Lucky Pick Generator
        </h2>
        <p className="text-sm text-muted-foreground">
          Generate your predicted numbers for PCSO Lotto 6/42
        </p>
      </div>

      {/* Last Draw + Next Draw */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Last Draw Results */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Last Draw Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contextLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : context?.lastDraw ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {formatDate(context.lastDraw.drawDate)}
                </p>
                <div className="flex gap-2">
                  {context.lastDraw.numbers.map((num, i) => (
                    <NumberBall key={i} number={num} size="lg" />
                  ))}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {context.lastDraw.jackpotAmount != null && (
                    <span className="font-medium text-green-600">
                      Jackpot: ₱
                      {context.lastDraw.jackpotAmount.toLocaleString()}
                    </span>
                  )}
                  {context.lastDraw.winnersCount != null && (
                    <span className="text-muted-foreground">
                      Winners: {context.lastDraw.winnersCount}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No draw data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Next Draw Countdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-blue-500" />
              Next Draw
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contextLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : countdown.nextDrawDate ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {countdown.nextDrawDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {countdown.nextDrawDate.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-3xl font-bold tabular-nums text-foreground">
                  {countdown.timeLeft}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Schedule unavailable
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Strategy / Mode Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            Pick Your Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Mode Tabs */}
          <Tabs
            value={method}
            onValueChange={(v) => setMethod(v as PickMethod)}
          >
            <TabsList>
              <TabsTrigger value="standard">Standard</TabsTrigger>
              <TabsTrigger value="simulation">Simulation</TabsTrigger>
              <TabsTrigger value="agent">AI Agent</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-4">
            {/* Standard tab controls */}
            {method === "standard" && (
              <div className="w-64 space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Strategy
                </Label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Simulation tab controls */}
            {method === "simulation" && (
              <>
                {veteranCombobox()}
              </>
            )}

            {/* AI Agent tab controls */}
            {method === "agent" && (
              <>
                <div className="w-44 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Model
                  </Label>
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {veteranCombobox()}
              </>
            )}

            {/* Sets selector — all modes */}
            <div className="w-32 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sets</Label>
              <Select
                value={String(count)}
                onValueChange={(v) => setCount(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 set</SelectItem>
                  <SelectItem value="3">3 sets</SelectItem>
                  <SelectItem value="5">5 sets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={activeMutation.isPending}
          >
            {activeMutation.isPending ? "Generating..." : "Generate Lucky Numbers"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, idx) => {
            const personality = extractPersonality(result.reasoning);
            return (
              <Card key={idx}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex gap-3">
                      {result.numbers.map((num, i) => (
                        <NumberBall key={i} number={num} size="lg" />
                      ))}
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{result.strategy}</Badge>
                        {personality && (
                          <Badge variant="secondary" className="text-xs">
                            {personality}
                          </Badge>
                        )}
                        {result.strategy === "ClaudeAi" &&
                          extractModelName(result.reasoning) && (
                            <Badge variant="secondary" className="text-xs">
                              {extractModelName(result.reasoning)}
                            </Badge>
                          )}
                        <span className="text-xs text-muted-foreground">
                          Confidence: {result.confidenceScore}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {stripModelPrefix(result.reasoning)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeMutation.isError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to generate prediction. Please try again.
        </div>
      )}

      {/* Prediction History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4" />
            Prediction History
            {history && (
              <span className="font-normal text-muted-foreground">
                ({history.totalCount.toLocaleString()} predictions)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : history && history.items.length > 0 ? (
            <>
              {/* Strategy filter */}
              {uniqueStrategies.length > 2 && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {uniqueStrategies.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={historyFilterStrategy === s ? "default" : "outline"}
                      onClick={() => setHistoryFilterStrategy(s)}
                    >
                      {s === "all" ? "All" : s}
                    </Button>
                  ))}
                </div>
              )}

              <div className="flex justify-end mb-2">
                <Select
                  value={String(historyPageSize)}
                  onValueChange={(v) => {
                    setHistoryPageSize(Number(v));
                    setHistoryPage(1);
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
                    <HistorySortableHead col="date" label="Date & Time" />
                    <TableHead>Your Numbers</TableHead>
                    <HistorySortableHead col="strategy" label="Strategy" />
                    <HistorySortableHead col="confidence" label="Confidence" />
                    <TableHead>Draw Result</TableHead>
                    <HistorySortableHead col="match" label="Match" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historySortedItems.map((item) => {
                    const personality = extractPersonality(item.reasoning);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(item.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {item.numbers.map((num, i) => (
                              <NumberBall key={i} number={num} size="sm" />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="text-xs">
                              {item.strategy}
                            </Badge>
                            {personality && (
                              <Badge
                                variant="secondary"
                                className="text-xs w-fit"
                              >
                                {personality}
                              </Badge>
                            )}
                            {item.strategy === "ClaudeAi" &&
                              extractModelName(item.reasoning) && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs w-fit"
                                >
                                  {extractModelName(item.reasoning)}
                                </Badge>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.confidenceScore}%
                        </TableCell>
                        <TableCell>
                          {item.matchInfo ? (
                            <div className="flex gap-1">
                              {item.matchInfo.drawNumbers.map((num, i) => (
                                <NumberBall key={i} number={num} size="sm" />
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Awaiting draw
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.matchInfo ? (
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                item.matchInfo.matchedCount >= 3
                                  ? "text-green-600"
                                  : item.matchInfo.matchedCount >= 1
                                    ? "text-orange-600"
                                    : "text-muted-foreground"
                              )}
                            >
                              {item.matchInfo.matchedCount}/6 (
                              {item.matchInfo.matchPercentage}%)
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-end gap-2">
                <p className="text-xs text-muted-foreground">
                  Page {historyPage} of {totalHistoryPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyPage >= totalHistoryPages}
                    onClick={() => setHistoryPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No predictions yet. Generate your first lucky pick above!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
