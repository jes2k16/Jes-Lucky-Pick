import apiClient from "@/lib/api-client";
import type { UserDto, PaginatedResponse } from "@/types/api";

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  role?: string;
  isActive?: boolean;
}

export async function fetchUsers(page: number, pageSize: number) {
  const { data } = await apiClient.get<PaginatedResponse<UserDto>>(
    "/admin/users",
    { params: { page, pageSize } }
  );
  return data;
}

export async function createUser(request: CreateUserRequest) {
  const { data } = await apiClient.post<UserDto>("/admin/users", request);
  return data;
}

export async function updateUser(id: string, request: UpdateUserRequest) {
  const { data } = await apiClient.put<UserDto>(`/admin/users/${id}`, request);
  return data;
}

export async function deleteUser(id: string) {
  await apiClient.delete(`/admin/users/${id}`);
}
