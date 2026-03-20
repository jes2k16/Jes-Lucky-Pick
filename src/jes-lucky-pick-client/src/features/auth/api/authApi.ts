import apiClient from "@/lib/api-client";
import type { LoginRequest, LoginResponse } from "@/types/api";

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/auth/login", data);
  return response.data;
}

export async function register(data: {
  username: string;
  email: string;
  password: string;
}) {
  const response = await apiClient.post("/auth/register", data);
  return response.data;
}

export async function logout() {
  await apiClient.post("/auth/logout");
}
