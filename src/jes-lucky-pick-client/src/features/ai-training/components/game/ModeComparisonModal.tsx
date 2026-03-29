import { useState } from "react";
import {
  Cpu,
  BrainCircuit,
  Lock,
  Shuffle,
  Search,
  BarChart3,
  Check,
  X,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ModeComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const personalities = [
  {
    name: "Scanner",
    icon: Search,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    simulation: {
      tries12: "Pick untested numbers — maximize coverage across the range",
      tries34: "Keep first N numbers from best try (N = stars), fill with untested",
      tries56: "If best >= 3★: keep + fill with top confidence. Else: pure top confidence",
    },
    ai: "Focus exploration on untested numbers from career data. Verify high-confidence numbers periodically. Use game memories to avoid re-testing numbers that historically never appear in secrets.",
  },
  {
    name: "Sticky",
    icon: Lock,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    simulation: {
      tries12: "Try 1: top confidence picks. Try 2+: lock best guess, swap (6 - stars) slots",
      tries34: "Same lock-and-swap — keep high-scoring numbers, replace the rest",
      tries56: "Same lock-and-swap — minimal changes, maximum preservation",
    },
    ai: "Lock in career-proven numbers first. Only explore in remaining slots. If a number appeared in multiple past winning combos, treat it as near-certain.",
  },
  {
    name: "Gambler",
    icon: Shuffle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    simulation: {
      tries12: "Keep 0-2 random numbers from best guess, swap the rest aggressively",
      tries34: "Same aggressive random swaps — high variance, high risk",
      tries56: "50/50 coin flip: top confidence OR keep half + random fill",
    },
    ai: "Use career patterns to find surprising combinations, not the obvious ones. Past game memories reveal unexpected number clusters — bet on those rather than playing it safe.",
  },
  {
    name: "Analyst",
    icon: BarChart3,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    simulation: {
      tries12: "Divide range into 6 sections, pick 1 number from each section",
      tries34: "Keep high-scoring numbers, try different numbers from the same sections",
      tries56: "Pure top confidence selection based on accumulated data",
    },
    ai: "Cross-reference cumulative confidence with game-by-game patterns. Analyze which sections of the number range have historically contained secret numbers. Use statistical reasoning across entire career.",
  },
];

const capabilityComparison = [
  {
    capability: "Remember past game secrets",
    simulation: false,
    ai: true,
    detail: "AI reads game memories showing what the secret actually was in each past game",
  },
  {
    capability: "Notice number co-occurrence patterns",
    simulation: false,
    ai: true,
    detail: "AI can reason: \"when 14 and 28 both appear, I usually get 3+ stars\"",
  },
  {
    capability: "Change strategy mid-game",
    simulation: false,
    ai: true,
    detail: "AI adapts its approach based on live results; simulation follows a fixed algorithm",
  },
  {
    capability: "Learn from post-game reveals",
    simulation: false,
    ai: true,
    detail: "AI writes a lesson after each game and reads it in future games",
  },
  {
    capability: "Reason about which numbers matched",
    simulation: false,
    ai: true,
    detail: "Simulation only knows star count; AI sees exactly which numbers were correct",
  },
  {
    capability: "Adjust based on career win rate",
    simulation: false,
    ai: true,
    detail: "AI can decide: \"5% win rate means my approach isn't working, try something new\"",
  },
  {
    capability: "Use confidence map across games",
    simulation: true,
    ai: true,
    detail: "Both modes carry forward cumulative confidence scores from veteran careers",
  },
  {
    capability: "Run without API calls",
    simulation: true,
    ai: false,
    detail: "Simulation runs entirely in the browser; AI mode requires Claude API calls",
  },
  {
    capability: "Deterministic personality behavior",
    simulation: true,
    ai: false,
    detail: "Simulation follows exact algorithms per personality; AI interprets guidelines flexibly",
  },
];

export function ModeComparisonModal({ open, onOpenChange }: ModeComparisonModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-primary" />
            How Modes Pick Numbers
          </DialogTitle>
          <DialogDescription>
            Simulation uses hardcoded algorithms. AI Agent uses Claude to reason each guess.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="personalities">By Personality</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Simulation Card */}
              <Card className="border-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    Simulation Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    Each personality runs a <strong className="text-foreground">fixed algorithm</strong> in
                    JavaScript. No reasoning, no adaptation beyond the confidence map formula.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-[10px]">
                        Try 1-2
                      </Badge>
                      <span className="text-muted-foreground">Exploration — test new numbers</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-[10px]">
                        Try 3-4
                      </Badge>
                      <span className="text-muted-foreground">Refinement — keep what scored</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-[10px]">
                        Try 5-6
                      </Badge>
                      <span className="text-muted-foreground">Exploitation — best confidence picks</span>
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
                    <strong className="text-foreground">Confidence update per try:</strong>
                    <br />
                    3+ stars: <span className="text-emerald-500 font-mono">+0.3</span> &nbsp;|&nbsp;
                    1-2 stars: <span className="text-amber-500 font-mono">+0.05</span> &nbsp;|&nbsp;
                    0 stars: <span className="text-red-500 font-mono">-0.2</span>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
                    <strong className="text-foreground">With veterans:</strong> Expert starts with a non-zero
                    confidence map from career data. The algorithms are unchanged — but top-confidence picks
                    now reflect numbers proven across past games.
                  </div>
                </CardContent>
              </Card>

              {/* AI Agent Card */}
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                    AI Agent Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    Each try is a <strong className="text-foreground">separate Claude API call</strong>. The AI
                    reads its full context and <em>decides</em> what to do. No hardcoded algorithm.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-[10px]">
                        Context
                      </Badge>
                      <span className="text-muted-foreground">Career history, confidence map, try history, personality</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-[10px]">
                        Memory
                      </Badge>
                      <span className="text-muted-foreground">Past game results, secrets revealed, self-written lessons</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-[10px]">
                        Reason
                      </Badge>
                      <span className="text-muted-foreground">Cross-references patterns, adapts strategy live</span>
                    </div>
                  </div>
                  <div className="rounded-md bg-primary/5 border border-primary/10 p-2.5 text-xs text-muted-foreground">
                    <strong className="text-foreground">Career memory (3 tiers):</strong>
                    <br />
                    <span className="text-primary font-medium">Recent 5</span> — full detail (guess, secret, matched, lesson)
                    <br />
                    <span className="text-primary font-medium">Games 6-20</span> — condensed stats and key lessons
                    <br />
                    <span className="text-primary font-medium">Older</span> — summarized trends and winning combos
                  </div>
                  <div className="rounded-md bg-primary/5 border border-primary/10 p-2.5 text-xs text-muted-foreground">
                    <strong className="text-foreground">Post-game learning:</strong> After each game, Claude writes a
                    one-line lesson about what worked. This lesson is stored and replayed in future games.
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Personalities Tab */}
          <TabsContent value="personalities" className="space-y-4 mt-4">
            {personalities.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.name} className={`${p.borderColor} border`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Icon className={`h-4 w-4 ${p.color}`} />
                      <span className={p.color}>{p.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Simulation column */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Simulation
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="rounded bg-muted/50 p-2">
                            <span className="font-mono text-muted-foreground">Try 1-2:</span>{" "}
                            <span className="text-foreground">{p.simulation.tries12}</span>
                          </div>
                          <div className="rounded bg-muted/50 p-2">
                            <span className="font-mono text-muted-foreground">Try 3-4:</span>{" "}
                            <span className="text-foreground">{p.simulation.tries34}</span>
                          </div>
                          <div className="rounded bg-muted/50 p-2">
                            <span className="font-mono text-muted-foreground">Try 5-6:</span>{" "}
                            <span className="text-foreground">{p.simulation.tries56}</span>
                          </div>
                        </div>
                      </div>
                      {/* AI column */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 mb-2">
                          <BrainCircuit className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium text-primary uppercase tracking-wide">
                            AI Agent
                          </span>
                        </div>
                        <div className="rounded bg-primary/5 border border-primary/10 p-2 text-xs text-foreground">
                          {p.ai}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Capabilities Tab */}
          <TabsContent value="capabilities" className="mt-4">
            <div className="rounded-lg border">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 p-3 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Capability</span>
                <span className="w-20 text-center">Simulation</span>
                <span className="w-20 text-center">AI Agent</span>
              </div>
              {capabilityComparison.map((row, i) => (
                <div
                  key={row.capability}
                  className={`grid grid-cols-[1fr_auto_auto] gap-x-4 p-3 items-start ${
                    i < capabilityComparison.length - 1 ? "border-b" : ""
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{row.capability}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{row.detail}</div>
                  </div>
                  <div className="w-20 flex justify-center pt-0.5">
                    {row.simulation ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="w-20 flex justify-center pt-0.5">
                    {row.ai ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
