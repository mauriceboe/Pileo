import { apiClient } from './client';

export interface ApiKeyPublic {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ApiKeyCreateResponse {
  key: ApiKeyPublic;
  rawKey: string;
}

export async function listApiKeys(projectId: string): Promise<ApiKeyPublic[]> {
  const res = await apiClient.get<{ data: ApiKeyPublic[] }>(`/projects/${projectId}/api-keys`);
  return res.data;
}

export async function createApiKey(projectId: string, name: string): Promise<ApiKeyCreateResponse> {
  const res = await apiClient.post<{ data: ApiKeyCreateResponse }>(`/projects/${projectId}/api-keys`, { name });
  return res.data;
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await apiClient.delete(`/api-keys/${keyId}`);
}
