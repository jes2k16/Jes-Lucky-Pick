import { useQuery } from "@tanstack/react-query";
import {
  fetchFrequency,
  fetchHotCold,
  fetchPatterns,
} from "@/features/analysis/api/analysisApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import { NumberBall } from "@/components/shared/NumberBall";
import { useUiStore } from "@/stores/uiStore";

export function AnalysisPage() {
  const theme = useUiStore((s) => s.theme);

  const { data: frequency, isLoading: freqLoading } = useQuery({
    queryKey: ["analysis", "frequency"],
    queryFn: fetchFrequency,
  });

  const { data: hotCold, isLoading: hotColdLoading } = useQuery({
    queryKey: ["analysis", "hot-cold"],
    queryFn: () => fetchHotCold(30),
  });

  const { data: patterns, isLoading: patternsLoading } = useQuery({
    queryKey: ["analysis", "patterns"],
    queryFn: fetchPatterns,
  });

  const chartTextColor = theme === "dark" ? "#a1a1aa" : "#71717a";
  const chartGridColor = theme === "dark" ? "hsl(240 3.7% 15.9%)" : "hsl(240 5.9% 90%)";
  const tooltipStyle = {
    background: theme === "dark" ? "#1c1c1e" : "#fff",
    color: theme === "dark" ? "#fff" : "#000",
    borderRadius: "6px",
    fontSize: "12px",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Analysis</h2>
        <p className="text-sm text-muted-foreground">
          Statistical analysis of PCSO 6/42 draw history
        </p>
      </div>

      {/* Frequency Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Number Frequency
          </CardTitle>
        </CardHeader>
        <CardContent>
          {freqLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : frequency ? (
            <div className="h-80">
              <ResponsiveBar
                data={frequency
                  .sort((a, b) => a.number - b.number)
                  .map((f) => ({
                    number: String(f.number),
                    count: f.count,
                  }))}
                keys={["count"]}
                indexBy="number"
                margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                padding={0.2}
                colors={({ index }: { index: number }) => {
                  const num = index + 1;
                  if (num <= 10) return "#ef4444";
                  if (num <= 20) return "#f97316";
                  if (num <= 30) return "#22c55e";
                  return "#3b82f6";
                }}
                axisBottom={{
                  tickRotation: -45,
                  legend: "Number",
                  legendPosition: "middle",
                  legendOffset: 40,
                  tickSize: 0,
                  tickPadding: 5,
                }}
                axisLeft={{
                  legend: "Frequency",
                  legendPosition: "middle",
                  legendOffset: -50,
                  tickSize: 0,
                  tickPadding: 8,
                }}
                theme={{
                  text: { fill: chartTextColor },
                  axis: {
                    ticks: { text: { fill: chartTextColor, fontSize: 10 } },
                    legend: { text: { fill: chartTextColor, fontSize: 12 } },
                  },
                  grid: { line: { stroke: chartGridColor } },
                  tooltip: { container: tooltipStyle },
                }}
                borderRadius={2}
                enableLabel={false}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Hot Numbers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-500">
              Hot Numbers (Last 30 Draws)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hotColdLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : hotCold ? (
              <div className="flex flex-wrap gap-3">
                {hotCold.hotNumbers.map((n) => (
                  <div
                    key={n.number}
                    className="flex flex-col items-center gap-1"
                  >
                    <NumberBall number={n.number} size="md" />
                    <span className="text-[10px] text-muted-foreground">
                      {n.count}x
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Cold Numbers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-500">
              Cold Numbers (Last 30 Draws)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hotColdLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : hotCold ? (
              <div className="flex flex-wrap gap-3">
                {hotCold.coldNumbers.map((n) => (
                  <div
                    key={n.number}
                    className="flex flex-col items-center gap-1"
                  >
                    <NumberBall number={n.number} size="md" />
                    <span className="text-[10px] text-muted-foreground">
                      {n.count}x
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Odd/Even Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Odd/Even Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patternsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : patterns ? (
            <div className="h-64">
              <ResponsivePie
                data={patterns.oddEvenDistributions.map((d) => ({
                  id: d.pattern,
                  label: d.pattern,
                  value: d.count,
                }))}
                margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
                innerRadius={0.5}
                padAngle={1}
                colors={{ scheme: "paired" }}
                arcLinkLabelsTextColor={chartTextColor}
                arcLinkLabelsThickness={2}
                arcLabelsTextColor="#fff"
                theme={{
                  text: { fill: chartTextColor },
                  tooltip: { container: tooltipStyle },
                }}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
