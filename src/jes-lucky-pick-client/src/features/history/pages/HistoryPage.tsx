import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDraws } from "@/features/history/api/drawsApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberBall } from "@/components/shared/NumberBall";
import { Skeleton } from "@/components/ui/skeleton";

export function HistoryPage() {
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["draws", page, fromDate, toDate],
    queryFn: () =>
      fetchDraws({
        page,
        pageSize,
        from: fromDate || undefined,
        to: toDate || undefined,
      }),
  });

  const totalPages = data ? Math.ceil(data.totalCount / pageSize) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Draw History</h2>
        <p className="text-gray-500 dark:text-gray-400">Browse past PCSO 6/42 draw results</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">From:</span>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="w-auto"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">To:</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="w-auto"
          />
        </div>
        {(fromDate || toDate) && (
          <Button
            variant="outline"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Results{" "}
            {data && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({data.totalCount.toLocaleString()} draws)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500 dark:text-gray-400">
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4">Day</th>
                      <th className="pb-2 pr-4">Numbers</th>
                      <th className="pb-2 pr-4">Jackpot</th>
                      <th className="pb-2">Winners</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.map((draw) => (
                      <tr key={draw.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 text-sm">{draw.drawDate}</td>
                        <td className="py-3 pr-4 text-sm text-gray-500 dark:text-gray-400">
                          {draw.dayOfWeek}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-1">
                            {draw.numbers.map((num, i) => (
                              <NumberBall key={i} number={num} size="sm" />
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm text-green-600">
                          {draw.jackpotAmount
                            ? `₱${draw.jackpotAmount.toLocaleString()}`
                            : "—"}
                        </td>
                        <td className="py-3 text-sm">
                          {draw.winnersCount ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
