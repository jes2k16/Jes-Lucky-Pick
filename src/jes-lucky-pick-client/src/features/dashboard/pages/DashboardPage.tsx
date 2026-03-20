import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardStats,
  fetchRecentDraws,
} from "@/features/dashboard/api/dashboardApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberBall } from "@/components/shared/NumberBall";

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: fetchDashboardStats,
  });

  const { data: recentDraws, isLoading: drawsLoading } = useQuery({
    queryKey: ["dashboard", "recent"],
    queryFn: () => fetchRecentDraws(5),
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h2>
        <p className="text-gray-500 dark:text-gray-400">PCSO Lotto 6/42 Overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : stats ? (
          <>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Draws</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalDraws.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">Most Frequent Number</p>
                <div className="mt-1 flex items-center gap-2">
                  <NumberBall number={stats.mostFrequentNumber} size="lg" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({stats.mostFrequentCount}x)
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">Last Jackpot</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.lastJackpot
                    ? `₱${stats.lastJackpot.toLocaleString()}`
                    : "N/A"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">Days Since Last Draw</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.daysSinceLastDraw}
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Recent Draws */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Draws</CardTitle>
        </CardHeader>
        <CardContent>
          {drawsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {recentDraws?.map((draw) => (
                <div
                  key={draw.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {draw.drawDate}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{draw.dayOfWeek}</p>
                  </div>
                  <div className="flex gap-2">
                    {draw.numbers.map((num, i) => (
                      <NumberBall key={i} number={num} size="sm" />
                    ))}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">
                      {draw.jackpotAmount
                        ? `₱${draw.jackpotAmount.toLocaleString()}`
                        : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
