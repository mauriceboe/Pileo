import type { ApiSuccessResponse } from '@pileo/shared';
import { apiClient } from './client';

export interface DashboardStats {
  totalTasks: number;
  completed: number;
  inProgress: number;
  notifications: number;
}

export interface UserTask {
  id: string;
  title: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  columnId: string;
  columnName: string;
  columnColor: string;
  boardId: string;
  boardName: string;
  projectId: string;
  createdAt: string;
}

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
