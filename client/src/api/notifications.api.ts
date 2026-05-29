import type { ApiSuccessResponse, Notification, NotificationsListResponse } from '@pileo/shared';
import { apiClient } from './client';

export type { NotificationsListResponse };

export async function listNotifications(): Promise<NotificationsListResponse> {
  return apiClient.get<NotificationsListResponse>('/notifications');
}

export async function markRead(notificationId: string): Promise<Notification> {
  const response = await apiClient.patch<ApiSuccessResponse<Notification>>(
    `/notifications/${notificationId}/read`,
  );
  return response.data;
}

export async function markAllRead(): Promise<void> {
  return apiClient.post<void>('/notifications/read-all');
}
