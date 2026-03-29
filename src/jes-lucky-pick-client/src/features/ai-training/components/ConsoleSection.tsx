import { useState, useCallback } from "react";
import {
  TerminalSquare,
  MessageCircle,
  Plus,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Terminal } from "@/features/ai-training/components/Terminal";

type Mode = "print" | "interactive";

interface Tab {
  id: string;
  label: string;
  mode: Mode;
  model: string;
}

const MODELS = [
  { value: "claude-sonnet-4-20250514", label: "Sonnet 4" },
  { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
  { value: "claude-opus-4-20250514", label: "Opus 4" },
];

let tabCounter = 1;

function createTab(): Tab {
  const id = crypto.randomUUID();
  const label = `Terminal ${tabCounter++}`;
  return { id, label, mode: "interactive", model: MODELS[0].value };
}

export function ConsoleSection() {
  const [tabs, setTabs] = useState<Tab[]>(() => [createTab()]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const addTab = useCallback(() => {
    const newTab = createTab();
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const filtered = prev.filter((t) => t.id !== id);
        if (activeTabId === id) {
          setActiveTabId(filtered[filtered.length - 1].id);
        }
        return filtered;
      });
    },
    [activeTabId]
  );

  const updateActiveTab = useCallback(
    (updates: Partial<Pick<Tab, "mode" | "model">>) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, ...updates } : t))
      );
    },
    [activeTabId]
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Controls: mode toggle + model selector */}
      <div className="flex items-center justify-end gap-3">
        <Select
          value={activeTab.model}
          onValueChange={(value) => updateActiveTab({ model: value })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <Button
            variant={activeTab.mode === "print" ? "default" : "ghost"}
            size="sm"
            onClick={() => updateActiveTab({ mode: "print" })}
            className="gap-2"
          >
            <TerminalSquare className="h-4 w-4" />
            Print
          </Button>
          <Button
            variant={activeTab.mode === "interactive" ? "default" : "ghost"}
            size="sm"
            onClick={() => updateActiveTab({ mode: "interactive" })}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Interactive
          </Button>
        </div>
      </div>

      {/* Tab bar + terminal */}
      <Card className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center border-b px-2 pt-2 gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-sm transition-colors whitespace-nowrap ${
                tab.id === activeTabId
                  ? "bg-background text-foreground border border-b-0 border-border -mb-px"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <TerminalSquare className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              <span className="text-xs text-muted-foreground">
                ({MODELS.find((m) => m.value === tab.model)?.label ?? "?"})
              </span>
              {tabs.length > 1 && (
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={addTab}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <CardContent className="flex-1 min-h-0 p-4">
          <Terminal
            key={`${activeTab.id}-${activeTab.mode}-${activeTab.model}`}
            mode={activeTab.mode}
            model={activeTab.model}
          />
        </CardContent>
      </Card>
    </div>
  );
}
