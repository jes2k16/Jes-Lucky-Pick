import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generatePrediction,
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
import { Label } from "@/components/ui/label";
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
import { Sparkles, History, Trophy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format-date";
import type { GameScheduleDto, PredictionResponse } from "@/types/api";

const strategies = [
  { value: "combined", label: "Combined (All Strategies)" },
  { value: "frequency", label: "Frequency Analysis" },
  { value: "hotcold", label: "Hot & Cold Numbers" },
  { value: "gap", label: "Gap Analysis (Due Numbers)" },
  { value: "aiweighted", label: "AI Weighted" },
  { value: "claudeai", label: "Claude AI" },
];

function extractModelName(reasoning: string): string | null {
  const match = reasoning.match(/^\[Model: (.+?)\]\s*/);
  return match ? match[1] : null;
}

function stripModelPrefix(reasoning: string): string {
  return reasoning.replace(/^\[Model: .+?\]\s*/, "");
}

const dayMap: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function useCountdown(schedule: GameScheduleDto | undefined, drawTimeIso: string | undefined) {
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

export function LuckyPickPage() {
  const [strategy, setStrategy] = useState("combined");
  const [count, setCount] = useState(1);
  const [results, setResults] = useState<PredictionResponse[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 10;
  const queryClient = useQueryClient();

  const { data: context, isLoading: contextLoading } = useQuery({
    queryKey: ["draws", "context"],
    queryFn: fetchDrawContext,
  });

  const countdown = useCountdown(
    context?.schedule,
    context?.lastDraw?.drawDate
  );

  const mutation = useMutation({
    mutationFn: () =>
      generatePrediction({ gameCode: "6_42", strategy, count }),
    onSuccess: (data) => {
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
    },
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["predictions", historyPage],
    queryFn: () =>
      fetchPredictionHistory({ page: historyPage, pageSize: historyPageSize }),
  });

  const totalHistoryPages = history
    ? Math.ceil(history.totalCount / historyPageSize)
    : 0;

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
                      Jackpot: ₱{context.lastDraw.jackpotAmount.toLocaleString()}
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
              <p className="text-sm text-muted-foreground">No draw data available</p>
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
              <p className="text-sm text-muted-foreground">Schedule unavailable</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            Pick Your Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="w-64 space-y-1">
              <Label className="text-xs text-muted-foreground">Strategy</Label>
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

            <div className="w-32 space-y-1">
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
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Generating..." : "Generate Lucky Numbers"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, idx) => (
            <Card key={idx}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex gap-3">
                    {result.numbers.map((num, i) => (
                      <NumberBall key={i} number={num} size="lg" />
                    ))}
                  </div>
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline">{result.strategy}</Badge>
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
          ))}
        </div>
      )}

      {mutation.isError && (
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Your Numbers</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Draw Result</TableHead>
                    <TableHead>Match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.items.map((item) => (
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
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
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
