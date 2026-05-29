import type {
  ApiSuccessResponse,
  AppSettings,
  UserPublic,
  AdminCreateUserInput,
  AdminUpdateRoleInput,
} from '@pileo/shared';
import { apiClient } from './client';

export type { AppSettings };

export async function getSettings(): Promise<AppSettings> {
  const response = await apiClient.get<ApiSuccessResponse<AppSettings>>('/admin/settings');
  return response.data;
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const response = await apiClient.patch<ApiSuccessResponse<AppSettings>>('/admin/settings', settings);
  return response.data;
}

export async function listUsers(): Promise<UserPublic[]> {
  const response = await apiClient.get<ApiSuccessResponse<UserPublic[]>>('/admin/users');
  return response.data;
}

export async function createUser(input: AdminCreateUserInput): Promise<UserPublic> {
  const response = await apiClient.post<ApiSuccessResponse<UserPublic>>(
    '/admin/users',
    input,
  );
  return response.data;
}

export async function deleteUser(userId: string): Promise<void> {
  await apiClient.delete(`/admin/users/${userId}`);
}

export async function updateUserRole(
  userId: string,
  input: AdminUpdateRoleInput,
): Promise<UserPublic> {
  const response = await apiClient.patch<ApiSuccessResponse<UserPublic>>(
    `/admin/users/${userId}/role`,
    input,
  );
  return response.data;
}
