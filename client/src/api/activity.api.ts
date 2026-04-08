import { apiClient } from './client';
import type { ApiSuccessResponse } from '@pileo/shared';

interface ActivityEntry {
  id: string;
  projectId: string;
  taskId: string | null;
  userId: string;
  action: string;
  details: string | null;
  createdAt: string;
}

export type { ActivityEntry };

export async function getTaskActivity(taskId: string): Promise<ActivityEntry[]> {
  const response = await apiClient.get<ApiSuccessResponse<ActivityEntry[]>>(
    `/tasks/${taskId}/activity`,
  );
  return response.data;
}

export async function getProjectActivity(projectId: string): Promise<ActivityEntry[]> {
  const response = await apiClient.get<ApiSuccessResponse<ActivityEntry[]>>(
    `/projects/${projectId}/activity`,
  );
  return response.data;
}
