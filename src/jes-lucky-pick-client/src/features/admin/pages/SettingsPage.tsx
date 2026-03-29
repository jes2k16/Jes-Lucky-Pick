import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAiSettings,
  updateAiSettings,
  fetchAiModels,
  testAiConnection,
} from "@/features/admin/api/settingsApi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, FlaskConical, Save, Loader2, Terminal } from "lucide-react";

const settingsSchema = z.object({
  model: z.string().min(1, "Please select a model"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: fetchAiSettings,
  });

  const { data: models } = useQuery({
    queryKey: ["ai-models"],
    queryFn: fetchAiModels,
  });

  const {
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: {
      model: settings?.model ?? "claude-sonnet-4-20250514",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      updateAiSettings({
        isEnabled: true,
        model: values.model,
      }),
    onSuccess: () => {
      setMessage({ type: "success", text: "Settings saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
    },
    onError: () => {
      setMessage({ type: "error", text: "Failed to save settings." });
    },
  });

  const testMutation = useMutation({
    mutationFn: testAiConnection,
    onSuccess: (result) => {
      setMessage({
        type: result.success ? "success" : "error",
        text: result.message,
      });
    },
    onError: () => {
      setMessage({ type: "error", text: "Failed to test connection." });
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    setMessage(null);
    saveMutation.mutate(values);
  };

  if (settingsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === "success"
              ? "bg-green-500/10 text-green-600"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="rounded-md bg-muted p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Terminal className="h-4 w-4" />
                Using Claude CLI
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                AI predictions are powered by the Claude CLI installed on the
                server. No API key required.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select
                value={watch("model")}
                onValueChange={(val) => setValue("model", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.model && (
                <p className="text-sm text-destructive">
                  {errors.model.message}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Settings
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={testMutation.isPending}
                onClick={() => {
                  setMessage(null);
                  testMutation.mutate();
                }}
              >
                {testMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FlaskConical className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
