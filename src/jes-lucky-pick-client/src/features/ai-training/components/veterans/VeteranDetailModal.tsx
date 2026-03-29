import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { NumberBall } from "@/components/shared/NumberBall";
import { useExpertRegistry } from "../../hooks/useExpertRegistry";
import { formatDate } from "@/lib/format-date";

const PERSONALITY_COLORS: Record<string, string> = {
  Scanner: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  Sticky: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  Gambler: "bg-red-500/10 text-red-500 border-red-500/20",
  Analyst: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

function resultBadgeVariant(
  result: string
): "default" | "destructive" | "secondary" {
  if (result === "won") return "default";
  if (result.startsWith("eliminated")) return "destructive";
  return "secondary";
}

interface VeteranDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  careerId: string | null;
}

export function VeteranDetailModal({
  open,
  onOpenChange,
  careerId,
}: VeteranDetailModalProps) {
  const { registry, getCareerById, updateCareer } = useExpertRegistry();
  const [nameInput, setNameInput] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const career = careerId ? getCareerById(careerId) : null;

  useEffect(() => {
    if (career) {
      setNameInput(career.name);
      setNameSaved(false);
      setNameError(null);
    }
  }, [careerId, career?.name]);

  if (!career) return null;

  const lottoStats = career.byLottoGame["6/42"];
  const winRate =
    career.gamesPlayed > 0
      ? Math.round((career.wins / career.gamesPlayed) * 100)
      : 0;

  const topHotNumbers: number[] = lottoStats
    ? Object.entries(lottoStats.confidenceMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([k]) => Number(k))
    : [];

  const recentMemories = lottoStats?.gameMemories.slice(-5).reverse() ?? [];

  function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed || !careerId) return;

    const isDuplicate = registry.experts.some(
      (e) => e.id !== careerId && e.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setNameError(`"${trimmed}" is already taken by another veteran.`);
      return;
    }

    setNameError(null);
    updateCareer(careerId, { name: trimmed });
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  function handleFavoriteClick() {
    if (!careerId || !career) return;
    updateCareer(careerId, { isFavorite: !career.isFavorite });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {career.name}
            <Badge
              variant="outline"
              className={PERSONALITY_COLORS[career.personality]}
            >
              {career.personality}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Edit Name */}
          <div className="space-y-1.5">
            <Label htmlFor="veteran-name">Name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="veteran-name"
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value); setNameError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                className={`max-w-xs${nameError ? " border-destructive" : ""}`}
              />
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={!nameInput.trim() || nameInput.trim() === career.name}
              >
                Save
              </Button>
              {nameSaved && (
                <span className="text-xs text-green-600">Name updated</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-auto"
                onClick={handleFavoriteClick}
                title={career.isFavorite ? "Remove from favorites" : "Mark as favorite"}
              >
                <Star
                  size={16}
                  className={
                    career.isFavorite
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }
                />
              </Button>
            </div>
            {nameError && (
              <p className="text-xs text-destructive">{nameError}</p>
            )}
          </div>

          {/* Career Stats */}
          <div>
            <p className="text-sm font-medium mb-2">Career Stats</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Games Played", value: career.gamesPlayed },
                { label: "Win Rate", value: `${winRate}%` },
                { label: "Best Score", value: `${career.bestEverScore}★` },
                { label: "Avg Score", value: `${career.avgRoundScore.toFixed(1)}★` },
              ].map(({ label, value }) => (
                <Card key={label}>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Games */}
          <div>
            <p className="text-sm font-medium mb-2">Recent Games (6/42)</p>
            {recentMemories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No games played for 6/42 yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recentMemories.map((memory, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center gap-2 text-sm border rounded-md p-2"
                  >
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(memory.playedAt)}
                    </span>
                    <Badge variant={resultBadgeVariant(memory.result)} className="text-xs">
                      {memory.result === "won"
                        ? "Won"
                        : memory.result.startsWith("eliminated")
                        ? "Eliminated"
                        : "Survived"}
                    </Badge>
                    {memory.mode && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {memory.mode === "ai-agent" ? "AI Agent" : "Simulation"}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {memory.bestScore}★
                    </span>
                    {memory.matchedNumbers.length > 0 && (
                      <div className="flex gap-0.5">
                        {memory.matchedNumbers.map((n) => (
                          <NumberBall key={n} number={n} size="sm" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confidence Insights */}
          <div>
            <p className="text-sm font-medium mb-2">Top 5 Hot Numbers</p>
            {topHotNumbers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No confidence data available yet.
              </p>
            ) : (
              <div className="flex gap-2">
                {topHotNumbers.map((n) => (
                  <NumberBall key={n} number={n} size="md" />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
