import type { ApiSuccessResponse, ActivityEntry } from '@pileo/shared';
import { apiClient } from './client';

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
