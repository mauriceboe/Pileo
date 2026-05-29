import type { ApiSuccessResponse, ApiKeyPublic, ApiKeyCreateResponse } from '@pileo/shared';
import { apiClient } from './client';

export type { ApiKeyPublic, ApiKeyCreateResponse };

export async function listApiKeys(projectId: string): Promise<ApiKeyPublic[]> {
  const res = await apiClient.get<ApiSuccessResponse<ApiKeyPublic[]>>(`/projects/${projectId}/api-keys`);
  return res.data;
}

export async function createApiKey(projectId: string, name: string): Promise<ApiKeyCreateResponse> {
  const res = await apiClient.post<ApiSuccessResponse<ApiKeyCreateResponse>>(`/projects/${projectId}/api-keys`, { name });
  return res.data;
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await apiClient.delete(`/api-keys/${keyId}`);
}
