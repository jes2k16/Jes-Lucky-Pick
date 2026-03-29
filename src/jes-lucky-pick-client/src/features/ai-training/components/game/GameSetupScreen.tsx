import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Play, Upload, BrainCircuit, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_SETTINGS,
  LOTTO_GAMES,
  type LottoGameType,
  type GameSettings,
  type WinnerProfile,
} from "../../types/game";
import { importProfile } from "../../utils/game-export";

const MODELS = [
  { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5 (Fast)" },
  { value: "claude-sonnet-4-20250514", label: "Sonnet 4 (Balanced)" },
  { value: "claude-opus-4-20250514", label: "Opus 4 (Smart)" },
];

const numField = (min: number, max?: number) => {
  let schema = z.number().min(min);
  if (max !== undefined) schema = schema.max(max);
  return schema;
};

const settingsSchema = z.object({
  managerCount: numField(1, 10),
  expertsPerManager: numField(1, 8),
  timeLimitMinutes: numField(1, 30),
  simulationSpeedMs: numField(50, 5000),
});

type FormValues = z.infer<typeof settingsSchema>;

interface GameSetupScreenProps {
  onStart: (settings: GameSettings, profile?: WinnerProfile) => void;
  disabled?: boolean;
}

export function GameSetupScreen({ onStart, disabled }: GameSetupScreenProps) {
  const [gameMode, setGameMode] = useState<"simulation" | "ai-agent">("simulation");
  const [lottoGame, setLottoGame] = useState<LottoGameType>(DEFAULT_SETTINGS.lottoGame);
  const [concurrencyMode, setConcurrencyMode] = useState<string>("sequential");
  const [model, setModel] = useState(DEFAULT_SETTINGS.model);
  const [importedProfile, setImportedProfile] = useState<WinnerProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      managerCount: DEFAULT_SETTINGS.managerCount,
      expertsPerManager: DEFAULT_SETTINGS.expertsPerManager,
      timeLimitMinutes: DEFAULT_SETTINGS.timeLimitMinutes,
      simulationSpeedMs: DEFAULT_SETTINGS.simulationSpeedMs,
    },
  });

  const onSubmit = (data: FormValues) => {
    if (disabled) return;
    const game = LOTTO_GAMES[lottoGame];
    const settings: GameSettings = {
      ...data,
      lottoGame,
      numberRangeMin: game.min,
      numberRangeMax: game.max,
      combinationSize: game.size,
      gameMode,
      concurrencyMode: concurrencyMode as GameSettings["concurrencyMode"],
      model,
      useVeterans: false,
    };
    onStart(settings, importedProfile ?? undefined);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const profile = await importProfile(file);
      setImportedProfile(profile);
    } catch (err) {
      alert(`Invalid profile: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        <Button
          type="button"
          variant={gameMode === "simulation" ? "default" : "ghost"}
          size="sm"
          onClick={() => !disabled && setGameMode("simulation")}
          className="gap-1.5 flex-1 text-xs"
          disabled={disabled}
        >
          <Cpu className="h-3.5 w-3.5" />
          Simulation
        </Button>
        <Button
          type="button"
          variant={gameMode === "ai-agent" ? "default" : "ghost"}
          size="sm"
          onClick={() => !disabled && setGameMode("ai-agent")}
          className="gap-1.5 flex-1 text-xs"
          disabled={disabled}
        >
          <BrainCircuit className="h-3.5 w-3.5" />
          AI Agent
        </Button>
      </div>

      {/* Mode explanation */}
      <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
        {gameMode === "simulation" ? (
          <>
            <p className="font-medium flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
              Simulation Mode
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Runs in your browser — no API calls. Experts use built-in
              strategies (Scanner, Sticky, Gambler, Analyst).
            </p>
          </>
        ) : (
          <>
            <p className="font-medium flex items-center gap-1.5">
              <BrainCircuit className="h-3.5 w-3.5 text-amber-500" />
              AI Agent Mode
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Each expert turn calls Claude CLI — the AI reasons about
              which numbers to pick. Uses API credits.
            </p>
          </>
        )}
      </div>

      {gameMode === "ai-agent" && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-3 pb-3 space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500 text-white text-xs">AI</Badge>
              <span className="text-xs text-muted-foreground">
                Uses Claude API credits
              </span>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Model</Label>
                <Select value={model} onValueChange={setModel} disabled={disabled}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Concurrency</Label>
                <Select value={concurrencyMode} onValueChange={setConcurrencyMode} disabled={disabled}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequential</SelectItem>
                    <SelectItem value="parallel-per-manager">Parallel / Manager</SelectItem>
                    <SelectItem value="fully-parallel">Fully Parallel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game parameters */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs">Game Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-3 pb-3">
          <div className="space-y-1">
            <Label className="text-xs">Lotto Game</Label>
            <Select value={lottoGame} onValueChange={(v) => setLottoGame(v as LottoGameType)} disabled={disabled}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(LOTTO_GAMES) as [LottoGameType, (typeof LOTTO_GAMES)[LottoGameType]][]).map(
                  ([key, game]) => (
                    <SelectItem key={key} value={key}>
                      {game.label} (pick {game.size} from 1–{game.max})
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="managerCount" className="text-xs">Managers</Label>
              <Input id="managerCount" type="number" className="h-8 text-xs" disabled={disabled} {...register("managerCount", { valueAsNumber: true })} />
              {errors.managerCount && (
                <p className="text-xs text-destructive">{errors.managerCount.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="expertsPerManager" className="text-xs">Experts/Mgr</Label>
              <Input id="expertsPerManager" type="number" className="h-8 text-xs" disabled={disabled} {...register("expertsPerManager", { valueAsNumber: true })} />
              {errors.expertsPerManager && (
                <p className="text-xs text-destructive">{errors.expertsPerManager.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="timeLimitMinutes" className="text-xs">Time (min)</Label>
              <Input id="timeLimitMinutes" type="number" className="h-8 text-xs" disabled={disabled} {...register("timeLimitMinutes", { valueAsNumber: true })} />
              {errors.timeLimitMinutes && (
                <p className="text-xs text-destructive">{errors.timeLimitMinutes.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="simulationSpeedMs" className="text-xs">Speed (ms)</Label>
              <Input id="simulationSpeedMs" type="number" className="h-8 text-xs" disabled={disabled} {...register("simulationSpeedMs", { valueAsNumber: true })} />
              {errors.simulationSpeedMs && (
                <p className="text-xs text-destructive">{errors.simulationSpeedMs.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import profile */}
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="gap-2 text-xs w-full"
          disabled={disabled}
        >
          <Upload className="h-3.5 w-3.5" />
          Import Winner Profile
        </Button>
        {importedProfile && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs truncate">
              {importedProfile.winner.expertName} ({importedProfile.personality})
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setImportedProfile(null)}
              className="text-xs h-6 px-2 shrink-0"
              disabled={disabled}
            >
              Remove
            </Button>
          </div>
        )}
      </div>

      {/* Start button */}
      <Button type="submit" size="sm" className="w-full gap-2" disabled={disabled}>
        <Play className="h-4 w-4" />
        {disabled ? "Game in Progress" : "Start Training"}
      </Button>
    </form>
  );
}
