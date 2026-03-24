import apiClient from "@/lib/api-client";
import type { DrawDto, PaginatedResponse } from "@/types/api";

export async function fetchDraws(params: {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
}): Promise<PaginatedResponse<DrawDto>> {
  const { data } = await apiClient.get<PaginatedResponse<DrawDto>>("/draws", {
    params,
  });
  return data;
}

export async function fetchLatestResults(
  gameCode: string = "6_42"
): Promise<{ added: number; message: string }> {
  const { data } = await apiClient.post<{ added: number; message: string }>(
    "/draws/fetch-latest",
    null,
    { params: { gameCode } }
  );
  return data;
}

export async function createDraw(request: {
  gameCode: string;
  drawDate: string;
  numbers: number[];
  jackpotAmount?: number | null;
  winnersCount?: number | null;
}): Promise<DrawDto> {
  const { data } = await apiClient.post<DrawDto>("/draws", request);
  return data;
}
