import apiClient from "@/lib/api-client";
import type { DashboardStatsDto, DrawDto } from "@/types/api";

export async function fetchDashboardStats(): Promise<DashboardStatsDto> {
  const { data } = await apiClient.get<DashboardStatsDto>("/dashboard/stats");
  return data;
}

export async function fetchRecentDraws(count = 5): Promise<DrawDto[]> {
  const { data } = await apiClient.get<DrawDto[]>("/dashboard/recent", {
    params: { count },
  });
  return data;
}
