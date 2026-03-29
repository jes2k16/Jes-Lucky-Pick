import { BrainCircuit, Cpu, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LOTTO_GAMES, type GameSettings } from "../../types/game";

const CONCURRENCY_LABELS: Record<string, string> = {
  sequential: "Sequential",
  "fully-parallel": "Fully Parallel",
};

const MODEL_LABELS: Record<string, string> = {
  "claude-haiku-4-5-20251001": "Haiku 4.5 (Fast)",
  "claude-sonnet-4-20250514": "Sonnet 4 (Balanced)",
  "claude-opus-4-20250514": "Opus 4 (Smart)",
};

interface GameParamsSummaryProps {
  settings: GameSettings;
  importedProfileName?: string;
}

export function GameParamsSummary({ settings, importedProfileName }: GameParamsSummaryProps) {
  const isAi = settings.gameMode === "ai-agent";
  const lottoGame = LOTTO_GAMES[settings.lottoGame];

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Game Parameters
      </p>

      {/* Mode badge */}
      <div className="flex items-center gap-2">
        {isAi ? (
          <Badge className="bg-amber-500 text-white gap-1.5 text-xs">
            <BrainCircuit className="h-3 w-3" />
            AI Agent
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <Cpu className="h-3 w-3" />
            Simulation
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          {lottoGame.label}
        </Badge>
        {settings.useVeterans && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Users className="h-3 w-3" />
            Veterans
          </Badge>
        )}
      </div>

      {/* Stats grid */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Managers</span>
              <span className="font-medium">{settings.managerCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Experts/Mgr</span>
              <span className="font-medium">{settings.expertsPerManager}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Time Limit</span>
              <span className="font-medium">{settings.timeLimitMinutes} min</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Speed</span>
              <span className="font-medium">{settings.simulationSpeedMs} ms</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Number Range</span>
              <span className="font-medium">1–{lottoGame.max}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Pick</span>
              <span className="font-medium">{lottoGame.size} numbers</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI config (only when ai-agent mode) */}
      {isAi && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-3 pb-3 space-y-2 px-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500 text-white text-xs">AI</Badge>
              <span className="text-xs text-muted-foreground">Agent settings</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="font-medium">{MODEL_LABELS[settings.model] ?? settings.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Concurrency</span>
                <span className="font-medium">
                  {CONCURRENCY_LABELS[settings.concurrencyMode] ?? settings.concurrencyMode}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Imported profile */}
      {importedProfileName && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Imported Profile</p>
          <Badge variant="outline" className="text-xs truncate max-w-full">
            {importedProfileName}
          </Badge>
        </div>
      )}
    </div>
  );
}
