import type { ApiSuccessResponse } from '@pileo/shared';
import { apiClient } from './client';

export interface TaskLink {
  id: string;
  taskId: string;
  url: string;
  createdAt: string;
  createdBy: string | null;
}

export async function listLinks(taskId: string): Promise<TaskLink[]> {
  const response = await apiClient.get<ApiSuccessResponse<TaskLink[]>>(
    `/tasks/${taskId}/links`,
  );
  return response.data;
}

export async function createLink(taskId: string, url: string): Promise<TaskLink> {
  const response = await apiClient.post<ApiSuccessResponse<TaskLink>>(
    `/tasks/${taskId}/links`,
    { url },
  );
  return response.data;
}

export async function deleteLink(linkId: string): Promise<void> {
  await apiClient.delete(`/links/${linkId}`);
}
