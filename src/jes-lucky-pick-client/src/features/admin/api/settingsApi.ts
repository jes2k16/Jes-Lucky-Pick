import apiClient from "@/lib/api-client";
import type {
  AiSettingsResponse,
  UpdateAiSettingsRequest,
  AiModelOption,
  AiTestResult,
} from "@/types/api";

export async function fetchAiSettings(): Promise<AiSettingsResponse> {
  const { data } = await apiClient.get<AiSettingsResponse>("/settings/ai");
  return data;
}

export async function updateAiSettings(
  request: UpdateAiSettingsRequest,
): Promise<void> {
  await apiClient.put("/settings/ai", request);
}

export async function fetchAiModels(): Promise<AiModelOption[]> {
  const { data } = await apiClient.get<AiModelOption[]>("/settings/ai/models");
  return data;
}

export async function testAiConnection(): Promise<AiTestResult> {
  const { data } = await apiClient.post<AiTestResult>("/settings/ai/test");
  return data;
}
