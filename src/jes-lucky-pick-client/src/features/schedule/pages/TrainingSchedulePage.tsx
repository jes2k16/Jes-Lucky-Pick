import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Trash2, Play, Save, Loader2, CheckCircle2 } from "lucide-react";
import {
  getSchedule,
  saveSchedule,
  localToUtcTime,
  utcToLocalTime,
} from "../api/schedule-api";
import { ScheduleHistoryGrid } from "../components/ScheduleHistoryGrid";
import { fetchDraws } from "@/features/history/api/drawsApi";
import { useTrainingSessionStore } from "@/stores/trainingSessionStore";
import type { GameSettings } from "@/features/ai-training/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

// ── Constants ──────────────────────────────────────────────────────────────

const DAYS = [
  { label: "Mon", bit: 1 },
  { label: "Tue", bit: 2 },
  { label: "Wed", bit: 4 },
  { label: "Thu", bit: 8 },
  { label: "Fri", bit: 16 },
  { label: "Sat", bit: 32 },
  { label: "Sun", bit: 64 },
] as const;

// ── Zod schema ─────────────────────────────────────────────────────────────

const timeSlotSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
});

const scheduleSchema = z
  .object({
    isEnabled: z.boolean(),
    frequencyType: z.enum(["daily", "weekly"]),
    daysOfWeekMask: z.number().int(),
    timeSlots: z.array(timeSlotSchema).min(1, "At least one time slot is required"),
    managerCount: z.number().int().min(1).max(10),
    expertsPerManager: z.number().int().min(1).max(8),
    timeLimitMinutes: z.number().int().min(1).max(30),
    useVeterans: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.frequencyType === "weekly" && data.daysOfWeekMask === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one day for weekly schedule",
        path: ["daysOfWeekMask"],
      });
    }
  });

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

const defaultGameSettings = { managerCount: 3, expertsPerManager: 4, timeLimitMinutes: 5, useVeterans: true };

function parseGameSettings(json: string) {
  try {
    return { ...defaultGameSettings, ...JSON.parse(json) };
  } catch {
    return defaultGameSettings;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function TrainingSchedulePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { startSession } = useTrainingSessionStore();

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ["training-schedule"],
    queryFn: getSchedule,
  });

  const formValues = useMemo((): ScheduleFormValues => {
    if (!schedule) {
      return {
        isEnabled: false,
        frequencyType: "daily",
        daysOfWeekMask: 0,
        timeSlots: [{ time: "00:00" }],
        ...defaultGameSettings,
      };
    }
    const gs = parseGameSettings(schedule.gameSettingsJson);
    return {
      isEnabled: schedule.isEnabled,
      frequencyType: schedule.frequencyType,
      daysOfWeekMask: schedule.daysOfWeekMask,
      timeSlots: schedule.timeSlots.map((utc) => ({ time: utcToLocalTime(utc) })),
      managerCount: gs.managerCount ?? defaultGameSettings.managerCount,
      expertsPerManager: gs.expertsPerManager ?? defaultGameSettings.expertsPerManager,
      timeLimitMinutes: gs.timeLimitMinutes ?? defaultGameSettings.timeLimitMinutes,
      useVeterans: gs.useVeterans ?? defaultGameSettings.useVeterans,
    };
  }, [schedule]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger: triggerValidation,
    getValues,
    control,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    values: formValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "timeSlots" });
  const frequencyType = watch("frequencyType");
  const daysOfWeekMask = watch("daysOfWeekMask");
  const isEnabled = watch("isEnabled");
  const useVeterans = watch("useVeterans");

  const toggleDay = (bit: number) => {
    setValue("daysOfWeekMask", daysOfWeekMask ^ bit, { shouldValidate: true });
  };

  const saveMutation = useMutation({
    mutationFn: (values: ScheduleFormValues) => {
      const gameSettingsJson = JSON.stringify({
        lottoGame: "6/42",
        managerCount: values.managerCount,
        expertsPerManager: values.expertsPerManager,
        timeLimitMinutes: values.timeLimitMinutes,
        combinationSize: 6,
        numberRangeMin: 1,
        numberRangeMax: 42,
        useVeterans: values.useVeterans,
      });
      return saveSchedule({
        isEnabled: values.isEnabled,
        frequencyType: values.frequencyType,
        daysOfWeekMask: values.daysOfWeekMask,
        timeSlots: values.timeSlots.map((s) => localToUtcTime(s.time)),
        gameSettingsJson,
      });
    },
    onSuccess: () => {
      setMessage({ type: "success", text: "Schedule saved." });
      queryClient.invalidateQueries({ queryKey: ["training-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-history"] });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: () => {
      setMessage({ type: "error", text: "Failed to save schedule." });
    },
  });

  const handleTrigger = async () => {
    const isValid = await triggerValidation();
    if (!isValid) return;
    const values = getValues();

    setTriggering(true);
    setShowTriggerDialog(false);
    try {
      let historicalDraws: number[][] | undefined;
      let historicalDrawItems: { numbers: number[]; drawDate: string }[] | undefined;
      try {
        const result = await fetchDraws({ pageSize: 500 });
        if (result.items.length > 0) {
          historicalDrawItems = result.items.map((d) => ({ numbers: d.numbers, drawDate: d.drawDate }));
          historicalDraws = historicalDrawItems.map((d) => d.numbers);
        }
      } catch {
        // fall back to random generation
      }

      const settings: GameSettings = {
        lottoGame: "6/42",
        numberRangeMin: 1,
        numberRangeMax: 42,
        combinationSize: 6,
        managerCount: values.managerCount,
        expertsPerManager: values.expertsPerManager,
        timeLimitMinutes: values.timeLimitMinutes,
        simulationSpeedMs: 200,
        gameMode: "scheduled",
        concurrencyMode: "fully-parallel",
        model: "claude-sonnet-4-6",
        useVeterans: values.useVeterans,
        historicalDraws,
        historicalDrawItems,
      };

      startSession(settings);
      setShowTriggerDialog(true);
    } catch {
      setMessage({ type: "error", text: "Failed to start training." });
    } finally {
      setTriggering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Training Schedule</h1>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* LEFT — Schedule form */}
        <div className="w-[400px] shrink-0">
          <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            {/* Enable toggle */}
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable Schedule</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically run training games on a schedule
                  </p>
                </div>
                <Switch checked={isEnabled} onCheckedChange={(v) => setValue("isEnabled", v)} />
              </CardContent>
            </Card>

            {/* Frequency */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">Frequency</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="flex gap-3">
                  {(["daily", "weekly"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setValue("frequencyType", f)}
                      className={`flex-1 rounded-md border py-2 text-sm capitalize transition-colors ${
                        frequencyType === f
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:bg-accent"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {frequencyType === "weekly" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Days</Label>
                    <div className="flex gap-1.5">
                      {DAYS.map(({ label, bit }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => toggleDay(bit)}
                          className={`flex-1 rounded-md border py-1 text-xs font-medium transition-colors ${
                            daysOfWeekMask & bit
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:bg-accent"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {errors.daysOfWeekMask && (
                      <p className="text-xs text-destructive">{errors.daysOfWeekMask.message}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time slots */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Time Slots{" "}
                    <span className="font-normal text-muted-foreground text-xs">(local, stored as UTC)</span>
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => append({ time: "08:00" })}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      type="time"
                      className="h-8 text-sm"
                      {...register(`timeSlots.${index}.time`)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {errors.timeSlots && !Array.isArray(errors.timeSlots) && (
                  <p className="text-xs text-destructive">
                    {(errors.timeSlots as { message?: string }).message}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Game settings */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">Game Settings</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Lotto Game</Label>
                  <div className="h-8 flex items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                    6/42 (pick 6 from 1–42)
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="managerCount" className="text-xs">Managers</Label>
                    <Input id="managerCount" type="number" className="h-8 text-sm"
                      {...register("managerCount", { valueAsNumber: true })} />
                    {errors.managerCount && (
                      <p className="text-xs text-destructive">{errors.managerCount.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="expertsPerManager" className="text-xs">Experts/Mgr</Label>
                    <Input id="expertsPerManager" type="number" className="h-8 text-sm"
                      {...register("expertsPerManager", { valueAsNumber: true })} />
                    {errors.expertsPerManager && (
                      <p className="text-xs text-destructive">{errors.expertsPerManager.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="timeLimitMinutes" className="text-xs">Time (min)</Label>
                    <Input id="timeLimitMinutes" type="number" className="h-8 text-sm"
                      {...register("timeLimitMinutes", { valueAsNumber: true })} />
                    {errors.timeLimitMinutes && (
                      <p className="text-xs text-destructive">{errors.timeLimitMinutes.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <Label className="text-xs">Use Veterans</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Include veteran experts with career history
                    </p>
                  </div>
                  <Switch checked={useVeterans} onCheckedChange={(v) => setValue("useVeterans", v)} />
                </div>
              </CardContent>
            </Card>

            {/* Trigger dialog */}
            {showTriggerDialog && (
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Training started successfully!
                </div>
                <p className="text-xs text-muted-foreground">
                  Would you like to watch the ongoing training?
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => navigate("/model-training")}>
                    Yes, Watch it
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowTriggerDialog(false)}>
                    No, Stay here
                  </Button>
                </div>
              </div>
            )}

            {/* Message */}
            {message && (
              <p className={`text-sm ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                {message.text}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="gap-1.5" onClick={handleTrigger} disabled={triggering}>
                {triggering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Trigger Now
              </Button>
              <Button type="submit" className="ml-auto gap-1.5" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Schedule
              </Button>
            </div>
          </form>
        </div>

        {/* RIGHT — History grid */}
        <div className="flex-1 min-w-0">
          <ScheduleHistoryGrid />
        </div>
      </div>
    </div>
  );
}
