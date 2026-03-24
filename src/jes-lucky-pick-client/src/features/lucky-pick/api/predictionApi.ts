import apiClient from "@/lib/api-client";
import type {
  DrawContextDto,
  PaginatedResponse,
  PredictionHistoryItem,
  PredictionResponse,
} from "@/types/api";

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

export async function fetchDrawContext(): Promise<DrawContextDto> {
  const { data } = await apiClient.get<DrawContextDto>("/draws/context");
  return data;
}

export async function fetchPredictionHistory(params: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<PredictionHistoryItem>> {
  const { data } = await apiClient.get<
    PaginatedResponse<PredictionHistoryItem>
  >("/predictions", { params });
  return data;
}
