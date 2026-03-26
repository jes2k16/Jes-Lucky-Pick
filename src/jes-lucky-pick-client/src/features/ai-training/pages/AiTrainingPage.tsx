import { BrainCircuit } from "lucide-react";
import { NumberTrainingGame } from "@/features/ai-training/components/game/NumberTrainingGame";

export function AiTrainingPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BrainCircuit className="h-6 w-6" />
          Model Training
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Number training game — experts compete to guess secret combinations
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <NumberTrainingGame />
      </div>
    </div>
  );
}
