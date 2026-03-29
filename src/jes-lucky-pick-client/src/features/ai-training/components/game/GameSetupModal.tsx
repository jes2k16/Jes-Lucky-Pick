import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Play, Upload, BrainCircuit, Cpu, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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
  type GameMode,
  type GameSettings,
  type WinnerProfile,
} from "../../types/game";
import { importProfile } from "../../utils/game-export";

const MODELS = [
  { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5 (Fast)" },
  { value: "claude-sonnet-4-20250514", label: "Sonnet 4 (Balanced)" },
  { value: "claude-opus-4-20250514", label: "Opus 4 (Smart)" },
];

const ACTIVE_GAMES: LottoGameType[] = ["6/42"];

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

interface GameSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (settings: GameSettings, profile?: WinnerProfile) => void;
  veteranCount?: number;
}

export function GameSetupModal({ open, onOpenChange, onStart, veteranCount = 0 }: GameSetupModalProps) {
  const [gameMode, setGameMode] = useState<GameMode>("simulation");
  const [lottoGame, setLottoGame] = useState<LottoGameType>(DEFAULT_SETTINGS.lottoGame);
  const [concurrencyMode, setConcurrencyMode] = useState<string>("fully-parallel");
  const [model, setModel] = useState(DEFAULT_SETTINGS.model);
  const [useVeterans, setUseVeterans] = useState(false);
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
      useVeterans,
    };
    onStart(settings, importedProfile ?? undefined);
    onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            New Training Game
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Mode tabs */}
          <Tabs value={gameMode} onValueChange={(v) => setGameMode(v as GameMode)}>
            <TabsList className="w-full">
              <TabsTrigger value="simulation" className="flex-1 gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                Simulation
              </TabsTrigger>
              <TabsTrigger value="ai-agent" className="flex-1 gap-1.5">
                <BrainCircuit className="h-3.5 w-3.5" />
                AI Agent
              </TabsTrigger>
            </TabsList>

            <TabsContent value="simulation" className="mt-3 space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                <p className="font-medium flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                  Simulation Mode
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Runs in your browser — no API calls. Experts use built-in
                  strategies (Scanner, Sticky, Gambler, Analyst).
                </p>
              </div>
            </TabsContent>

            <TabsContent value="ai-agent" className="mt-3 space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                <p className="font-medium flex items-center gap-1.5">
                  <BrainCircuit className="h-3.5 w-3.5 text-amber-500" />
                  AI Agent Mode
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Each expert turn calls Claude CLI — the AI reasons about
                  which numbers to pick. Uses API credits.
                </p>
              </div>
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
                      <Select value={model} onValueChange={setModel}>
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
                      <Select value={concurrencyMode} onValueChange={setConcurrencyMode}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sequential">Sequential</SelectItem>
                          <SelectItem value="fully-parallel">Fully Parallel</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                        {concurrencyMode === "sequential" && "One expert calls Claude at a time. Slowest but uses fewest API credits."}
                        {concurrencyMode === "fully-parallel" && "All experts across all managers run at once. Fastest but uses the most API credits."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Game parameters — shared across both modes */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs">Game Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-3 pb-3">
              <div className="space-y-1">
                <Label className="text-xs">Lotto Game</Label>
                <Select value={lottoGame} onValueChange={(v) => setLottoGame(v as LottoGameType)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(LOTTO_GAMES) as [LottoGameType, (typeof LOTTO_GAMES)[LottoGameType]][]).map(
                      ([key, game]) => {
                        const isActive = ACTIVE_GAMES.includes(key);
                        return (
                          <SelectItem
                            key={key}
                            value={key}
                            disabled={!isActive}
                            className={!isActive ? "opacity-50" : ""}
                          >
                            {game.label} (pick {game.size} from 1–{game.max})
                            {!isActive && " — Coming Soon"}
                          </SelectItem>
                        );
                      }
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="managerCount" className="text-xs">Managers</Label>
                  <Input
                    id="managerCount"
                    type="number"
                    className="h-8 text-xs"
                    {...register("managerCount", { valueAsNumber: true })}
                  />
                  {errors.managerCount && (
                    <p className="text-xs text-destructive">{errors.managerCount.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="expertsPerManager" className="text-xs">Experts/Mgr</Label>
                  <Input
                    id="expertsPerManager"
                    type="number"
                    className="h-8 text-xs"
                    {...register("expertsPerManager", { valueAsNumber: true })}
                  />
                  {errors.expertsPerManager && (
                    <p className="text-xs text-destructive">{errors.expertsPerManager.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="timeLimitMinutes" className="text-xs">Time (min)</Label>
                  <Input
                    id="timeLimitMinutes"
                    type="number"
                    className="h-8 text-xs"
                    {...register("timeLimitMinutes", { valueAsNumber: true })}
                  />
                  {errors.timeLimitMinutes && (
                    <p className="text-xs text-destructive">{errors.timeLimitMinutes.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="simulationSpeedMs" className="text-xs">Speed (ms)</Label>
                  <Input
                    id="simulationSpeedMs"
                    type="number"
                    className="h-8 text-xs"
                    {...register("simulationSpeedMs", { valueAsNumber: true })}
                  />
                  {errors.simulationSpeedMs && (
                    <p className="text-xs text-destructive">{errors.simulationSpeedMs.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Veteran experts toggle */}
          <Card>
            <CardContent className="pt-3 pb-3 px-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs font-medium">Use veteran experts</Label>
                    <p className="text-xs text-muted-foreground">
                      Seed experts with knowledge from past games
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {useVeterans && veteranCount > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {veteranCount} available
                    </Badge>
                  )}
                  <Switch
                    checked={useVeterans}
                    onCheckedChange={setUseVeterans}
                    disabled={veteranCount === 0}
                  />
                </div>
              </div>
              {veteranCount === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  No veterans yet — play some games first to build career data.
                </p>
              )}
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
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Play className="h-4 w-4" />
              Start Training
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
