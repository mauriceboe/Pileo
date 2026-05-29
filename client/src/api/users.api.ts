import type { ApiSuccessResponse, UserPublic } from '@pileo/shared';
import { apiClient } from './client';

export async function updateProfile(input: { displayName?: string }): Promise<UserPublic> {
  const response = await apiClient.patch<ApiSuccessResponse<UserPublic>>('/users/me', input);
  return response.data;
}

export async function uploadAvatar(file: File): Promise<UserPublic> {
  const formData = new FormData();
  formData.append('avatar', file);
  const response = await apiClient.upload<ApiSuccessResponse<UserPublic>>(
    '/users/me/avatar',
    formData,
    'PATCH',
  );
  return response.data;
}
