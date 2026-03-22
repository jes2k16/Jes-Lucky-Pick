import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardStats,
  fetchRecentDraws,
} from "@/features/dashboard/api/dashboardApi";
import { fetchFrequency } from "@/features/analysis/api/analysisApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberBall } from "@/components/shared/NumberBall";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";
import {
  Hash,
  CalendarDays,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { useUiStore } from "@/stores/uiStore";

export function DashboardPage() {
  const theme = useUiStore((s) => s.theme);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: fetchDashboardStats,
  });

  const { data: recentDraws, isLoading: drawsLoading } = useQuery({
    queryKey: ["dashboard", "recent"],
    queryFn: () => fetchRecentDraws(10),
  });

  const { data: frequency, isLoading: freqLoading } = useQuery({
    queryKey: ["analysis", "frequency"],
    queryFn: fetchFrequency,
  });

  const chartTextColor = theme === "dark" ? "#a1a1aa" : "#71717a";
  const chartGridColor = theme === "dark" ? "hsl(240 3.7% 15.9%)" : "hsl(240 5.9% 90%)";

  const kpiCards = stats
    ? [
        {
          label: "Total Draws",
          value: stats.totalDraws.toLocaleString(),
          icon: Hash,
          iconColor: "text-blue-500",
          iconBg: "bg-blue-500/10",
          sub: `Since 1994`,
        },
        {
          label: "Most Frequent",
          value: null,
          numberBall: stats.mostFrequentNumber,
          icon: TrendingUp,
          iconColor: "text-orange-500",
          iconBg: "bg-orange-500/10",
          sub: `Appeared ${stats.mostFrequentCount}x`,
        },
        {
          label: "Last Jackpot",
          value: stats.lastJackpot
            ? `₱${stats.lastJackpot.toLocaleString()}`
            : "N/A",
          icon: Trophy,
          iconColor: "text-green-500",
          iconBg: "bg-green-500/10",
          sub: stats.lastDrawDate ?? "",
        },
        {
          label: "Days Since Draw",
          value: String(stats.daysSinceLastDraw),
          icon: CalendarDays,
          iconColor: "text-purple-500",
          iconBg: "bg-purple-500/10",
          sub:
            stats.daysSinceLastDraw <= 2
              ? "Recent"
              : stats.daysSinceLastDraw <= 4
                ? "Due soon"
                : "Overdue",
        },
      ]
    : [];

  // Prepare line chart data from recent draws (jackpot trend)
  const lineData =
    recentDraws && recentDraws.length > 0
      ? [
          {
            id: "Jackpot",
            data: [...recentDraws]
              .reverse()
              .filter((d) => d.jackpotAmount != null)
              .map((d) => ({
                x: d.drawDate,
                y: d.jackpotAmount!,
              })),
          },
        ]
      : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          PCSO Lotto 6/42 Overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="mb-3 h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : kpiCards.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {kpi.label}
                        </p>
                        {kpi.numberBall != null ? (
                          <div className="flex items-center gap-2 pt-1">
                            <NumberBall number={kpi.numberBall} size="lg" />
                          </div>
                        ) : (
                          <p className="text-2xl font-bold text-foreground">
                            {kpi.value}
                          </p>
                        )}
                      </div>
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.iconBg}`}
                      >
                        <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                      </div>
                    </div>
                    {kpi.sub && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {kpi.sub}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Frequency Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Number Frequency
            </CardTitle>
          </CardHeader>
          <CardContent>
            {freqLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : frequency ? (
              <div className="h-64">
                <ResponsiveBar
                  data={frequency
                    .sort((a, b) => a.number - b.number)
                    .map((f) => ({
                      number: String(f.number),
                      count: f.count,
                    }))}
                  keys={["count"]}
                  indexBy="number"
                  margin={{ top: 10, right: 10, bottom: 40, left: 45 }}
                  padding={0.25}
                  colors={({ index }: { index: number }) => {
                    const num = index + 1;
                    if (num <= 10) return "#ef4444";
                    if (num <= 20) return "#f97316";
                    if (num <= 30) return "#22c55e";
                    return "#3b82f6";
                  }}
                  axisBottom={{
                    tickRotation: -45,
                    tickSize: 0,
                    tickPadding: 5,
                  }}
                  axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                  }}
                  gridYValues={5}
                  theme={{
                    text: { fill: chartTextColor },
                    axis: {
                      ticks: { text: { fill: chartTextColor, fontSize: 10 } },
                    },
                    grid: { line: { stroke: chartGridColor } },
                    tooltip: {
                      container: {
                        background: theme === "dark" ? "#1c1c1e" : "#fff",
                        color: theme === "dark" ? "#fff" : "#000",
                        borderRadius: "6px",
                        fontSize: "12px",
                      },
                    },
                  }}
                  borderRadius={2}
                  enableLabel={false}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Jackpot Trend Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Jackpot Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {drawsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : lineData[0]?.data.length ? (
              <div className="h-64">
                <ResponsiveLine
                  data={lineData}
                  margin={{ top: 10, right: 20, bottom: 40, left: 60 }}
                  xScale={{ type: "point" }}
                  yScale={{ type: "linear", min: "auto", max: "auto" }}
                  curve="monotoneX"
                  colors={["#22c55e"]}
                  pointSize={6}
                  pointColor={{ theme: "background" }}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: "serieColor" }}
                  enableArea
                  areaOpacity={0.1}
                  axisBottom={{
                    tickRotation: -45,
                    tickSize: 0,
                    tickPadding: 5,
                  }}
                  axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                    format: (v) =>
                      `₱${(Number(v) / 1_000_000).toFixed(1)}M`,
                  }}
                  enableGridX={false}
                  theme={{
                    text: { fill: chartTextColor },
                    axis: {
                      ticks: { text: { fill: chartTextColor, fontSize: 10 } },
                    },
                    grid: { line: { stroke: chartGridColor } },
                    crosshair: {
                      line: { stroke: chartTextColor, strokeOpacity: 0.3 },
                    },
                    tooltip: {
                      container: {
                        background: theme === "dark" ? "#1c1c1e" : "#fff",
                        color: theme === "dark" ? "#fff" : "#000",
                        borderRadius: "6px",
                        fontSize: "12px",
                      },
                    },
                  }}
                  useMesh
                />
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No jackpot data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Draws Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Draws</CardTitle>
        </CardHeader>
        <CardContent>
          {drawsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Numbers</TableHead>
                  <TableHead className="text-right">Jackpot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDraws?.map((draw) => (
                  <TableRow key={draw.id}>
                    <TableCell className="text-sm font-medium">
                      {draw.drawDate}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {draw.dayOfWeek}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {draw.numbers.map((num, i) => (
                          <NumberBall key={i} number={num} size="sm" />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-green-600">
                      {draw.jackpotAmount
                        ? `₱${draw.jackpotAmount.toLocaleString()}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
