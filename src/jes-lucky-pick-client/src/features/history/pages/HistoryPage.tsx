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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NumberBall } from "@/components/shared/NumberBall";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";

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
        <h2 className="text-2xl font-bold text-foreground">Draw History</h2>
        <p className="text-sm text-muted-foreground">
          Browse past PCSO 6/42 draw results
        </p>
      </div>

      {/* Filters */}
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
            className="w-auto"
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
            className="w-auto"
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
      </div>

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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Numbers</TableHead>
                    <TableHead className="text-right">Jackpot</TableHead>
                    <TableHead className="text-right">Winners</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.map((draw) => (
                    <TableRow key={draw.id}>
                      <TableCell className="text-sm font-medium">
                        {draw.drawDate}
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
                        {draw.winnersCount ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
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
