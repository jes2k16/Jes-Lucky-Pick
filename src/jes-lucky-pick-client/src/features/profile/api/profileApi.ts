import apiClient from "@/lib/api-client";
import type { ProfileResponse, UpdateProfileRequest } from "@/types/api";

export async function fetchProfile(): Promise<ProfileResponse> {
  const { data } = await apiClient.get<ProfileResponse>("/profile");
  return data;
}

export async function updateProfile(
  request: UpdateProfileRequest
): Promise<ProfileResponse> {
  const { data } = await apiClient.put<ProfileResponse>("/profile", request);
  return data;
}

export async function uploadAvatar(
  base64Image: string
): Promise<{ profilePictureBase64: string }> {
  const { data } = await apiClient.post<{ profilePictureBase64: string }>(
    "/profile/avatar",
    { base64Image }
  );
  return data;
}

export async function deleteAvatar(): Promise<void> {
  await apiClient.delete("/profile/avatar");
}
