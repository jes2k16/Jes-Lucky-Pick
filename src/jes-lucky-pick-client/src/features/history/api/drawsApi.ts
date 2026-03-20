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
