import { apiClient } from './client';
import type { Notification } from '@pileo/shared';

interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
}

interface NotificationResponse {
  data: Notification;
}

export async function listNotifications(): Promise<NotificationsResponse> {
  return apiClient.get<NotificationsResponse>('/notifications');
}

export async function markRead(notificationId: string): Promise<Notification> {
  const response = await apiClient.patch<NotificationResponse>(
    `/notifications/${notificationId}/read`,
  );
  return response.data;
}

export async function markAllRead(): Promise<void> {
  return apiClient.post<void>('/notifications/read-all');
}
