import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarDisplayProps {
  score: number;
  max: number;
  size?: "sm" | "md";
}

export function StarDisplay({ score, max, size = "md" }: StarDisplayProps) {
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={cn(
            iconSize,
            i < score
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}
