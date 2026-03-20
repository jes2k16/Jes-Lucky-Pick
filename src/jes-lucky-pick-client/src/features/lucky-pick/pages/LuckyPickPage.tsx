import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { generatePrediction } from "@/features/lucky-pick/api/predictionApi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumberBall } from "@/components/shared/NumberBall";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { PredictionResponse } from "@/types/api";

const strategies = [
  { value: "combined", label: "Combined (All Strategies)" },
  { value: "frequency", label: "Frequency Analysis" },
  { value: "hotcold", label: "Hot & Cold Numbers" },
  { value: "gap", label: "Gap Analysis (Due Numbers)" },
  { value: "aiweighted", label: "AI Weighted" },
];

export function LuckyPickPage() {
  const [strategy, setStrategy] = useState("combined");
  const [count, setCount] = useState(1);
  const [results, setResults] = useState<PredictionResponse[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      generatePrediction({ gameCode: "6_42", strategy, count }),
    onSuccess: (data) => setResults(data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Lucky Pick Generator</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Generate your predicted numbers for PCSO Lotto 6/42
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Pick Your Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="w-64">
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                Strategy
              </label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-32">
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">Sets</label>
              <Select
                value={String(count)}
                onValueChange={(v) => setCount(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 set</SelectItem>
                  <SelectItem value="3">3 sets</SelectItem>
                  <SelectItem value="5">5 sets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            size="lg"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {mutation.isPending ? "Generating..." : "Generate Lucky Numbers"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, idx) => (
            <Card key={idx} className="border-indigo-200">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex gap-3">
                    {result.numbers.map((num, i) => (
                      <NumberBall key={i} number={num} size="lg" />
                    ))}
                  </div>
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline">{result.strategy}</Badge>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Confidence: {result.confidenceScore}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{result.reasoning}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {mutation.isError && (
        <div className="rounded-md bg-red-50 dark:bg-red-950 p-4 text-sm text-red-600 dark:text-red-400">
          Failed to generate prediction. Please try again.
        </div>
      )}
    </div>
  );
}
