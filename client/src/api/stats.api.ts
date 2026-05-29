import type { ApiSuccessResponse, DashboardStats, UserTask } from '@pileo/shared';
import { apiClient } from './client';

export type { DashboardStats, UserTask };

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<ApiSuccessResponse<DashboardStats>>(
    '/users/me/stats',
  );
  return response.data;
}

export async function getUserTasks(): Promise<UserTask[]> {
  const response = await apiClient.get<ApiSuccessResponse<UserTask[]>>(
    '/users/me/tasks',
  );
  return response.data;
}
