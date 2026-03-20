import apiClient from "@/lib/api-client";
import type { PredictionResponse } from "@/types/api";

export async function generatePrediction(params: {
  gameCode: string;
  strategy: string;
  count: number;
}): Promise<PredictionResponse[]> {
  const { data } = await apiClient.post<PredictionResponse[]>(
    "/predictions/generate",
    params
  );
  return data;
}
