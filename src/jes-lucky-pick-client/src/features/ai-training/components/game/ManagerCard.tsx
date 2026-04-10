import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ExpertRow } from "./ExpertRow";
import type { Manager } from "../../types/game";

interface ManagerCardProps {
  manager: Manager;
  combinationSize: number;
  currentExpertId: string | null;
}

export function ManagerCard({
  manager,
  combinationSize,
  currentExpertId,
}: ManagerCardProps) {
  const isFailed = manager.status === "failed";
  const isWinner = manager.status === "winner";
  const activeCount = manager.experts.filter((e) => e.status === "active").length;

  return (
    <Card
      className={cn(
        "transition-colors",
        isFailed && "border-destructive/40 opacity-70",
        isWinner && "border-emerald-500/50 shadow-emerald-500/10 shadow-lg"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            {manager.id.toUpperCase()}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isWinner && (
              <Badge className="bg-emerald-500 text-white">Winner</Badge>
            )}
            {isFailed && (
              <Badge variant="destructive">Failed</Badge>
            )}
            {!isFailed && !isWinner && (
              <Badge variant="outline" className="text-xs">
                {activeCount} active
              </Badge>
            )}
          </div>
        </div>
        {/* Secret combination — revealed */}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-muted-foreground mr-1">Secret:</span>
          {manager.secretCombination.map((num, i) => (
            <span
              key={i}
              className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-mono font-bold"
            >
              {num}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {manager.experts.map((expert) => (
          <ExpertRow
            key={expert.id}
            expert={expert}
            combinationSize={combinationSize}
            isCurrentlyGuessing={expert.id === currentExpertId}
          />
        ))}
      </CardContent>
    </Card>
  );
}
