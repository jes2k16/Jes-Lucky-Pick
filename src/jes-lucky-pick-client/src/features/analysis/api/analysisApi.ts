import apiClient from "@/lib/api-client";
import type { FrequencyDto, HotColdDto, GapDto, PatternDto } from "@/types/api";

export async function fetchFrequency(): Promise<FrequencyDto[]> {
  const { data } = await apiClient.get<FrequencyDto[]>("/analysis/frequency");
  return data;
}

export async function fetchHotCold(period = 30): Promise<HotColdDto> {
  const { data } = await apiClient.get<HotColdDto>("/analysis/hot-cold", {
    params: { period },
  });
  return data;
}

export async function fetchGap(): Promise<GapDto[]> {
  const { data } = await apiClient.get<GapDto[]>("/analysis/gap");
  return data;
}

export async function fetchPatterns(): Promise<PatternDto> {
  const { data } = await apiClient.get<PatternDto>("/analysis/patterns");
  return data;
}
