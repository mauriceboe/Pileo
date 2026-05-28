import { apiClient } from './client';

export interface OAuthClient {
  id: string;
  name: string;
  redirectUris: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
}

export interface OAuthClientCreateResult {
  client: OAuthClient;
  clientSecret: string | null;
}

interface RegisterResponse {
  client_id: string;
  client_secret: string | null;
  client_id_issued_at: number;
  client_name: string;
  redirect_uris: string[];
  token_endpoint_auth_method: 'none' | 'client_secret_post';
}

export async function listOAuthClients(): Promise<OAuthClient[]> {
  const res = await apiClient.get<{ data: OAuthClient[] }>('/oauth/clients');
  return res.data;
}

export async function registerOAuthClient(input: {
  name: string;
  redirectUris: string[];
  isPublic: boolean;
}): Promise<OAuthClientCreateResult> {
  const res = await apiClient.post<RegisterResponse>('/oauth/register', {
    client_name: input.name,
    redirect_uris: input.redirectUris,
    token_endpoint_auth_method: input.isPublic ? 'none' : 'client_secret_post',
  });
  return {
    client: {
      id: res.client_id,
      name: res.client_name,
      redirectUris: res.redirect_uris,
      isPublic: res.token_endpoint_auth_method === 'none',
      createdBy: '',
      createdAt: new Date(res.client_id_issued_at * 1000).toISOString(),
    },
    clientSecret: res.client_secret,
  };
}

export async function revokeOAuthClient(clientId: string): Promise<void> {
  await apiClient.delete(`/oauth/clients/${clientId}`);
}
