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

export function AnalysisPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analysis</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Statistical analysis of PCSO 6/42 draw history
        </p>
      </div>

      {/* Frequency Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Number Frequency</CardTitle>
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
                }}
                axisLeft={{
                  legend: "Frequency",
                  legendPosition: "middle",
                  legendOffset: -50,
                }}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Hot Numbers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Hot Numbers (Last 30 Draws)</CardTitle>
          </CardHeader>
          <CardContent>
            {hotColdLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : hotCold ? (
              <div className="flex flex-wrap gap-3">
                {hotCold.hotNumbers.map((n) => (
                  <div key={n.number} className="flex flex-col items-center gap-1">
                    <NumberBall number={n.number} size="md" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{n.count}x</span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Cold Numbers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">Cold Numbers (Last 30 Draws)</CardTitle>
          </CardHeader>
          <CardContent>
            {hotColdLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : hotCold ? (
              <div className="flex flex-wrap gap-3">
                {hotCold.coldNumbers.map((n) => (
                  <div key={n.number} className="flex flex-col items-center gap-1">
                    <NumberBall number={n.number} size="md" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{n.count}x</span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Odd/Even Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Odd/Even Distribution</CardTitle>
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
                arcLinkLabelsTextColor="#333"
                arcLinkLabelsThickness={2}
                arcLabelsTextColor="#fff"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
