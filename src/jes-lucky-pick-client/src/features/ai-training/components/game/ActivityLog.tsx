import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { ActivityLogEntry } from "../../types/game";

const typeColors: Record<string, string> = {
  info: "text-muted-foreground",
  score: "text-sky-400/80",
  elimination: "text-red-400",
  winner: "text-emerald-400",
  round: "text-amber-400",
};

interface ActivityLogProps {
  entries: ActivityLogEntry[];
}

export function ActivityLog({ entries }: ActivityLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div
      ref={scrollRef}
      className="h-48 overflow-y-auto rounded-md bg-muted/30 border p-3 font-mono text-xs space-y-0.5"
    >
      {entries.length === 0 && (
        <span className="text-muted-foreground">Waiting for game to start...</span>
      )}
      {entries.map((entry, i) => (
        <div key={i} className={cn("leading-relaxed", typeColors[entry.type])}>
          <span className="text-muted-foreground/50 mr-2">
            {new Date(entry.timestamp).toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
          {entry.message}
        </div>
      ))}
    </div>
  );
}
