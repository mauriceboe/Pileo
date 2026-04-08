import { create } from 'zustand';
import type { Notification } from '@pileo/shared';
import * as notificationsApi from '../api/notifications.api';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;

  fetchNotifications: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (): Promise<void> => {
    set({ isLoading: true });
    try {
      const response = await notificationsApi.listNotifications();
      set({
        notifications: response.data,
        unreadCount: response.unreadCount,
      });
    } catch {
      // Non-critical
    } finally {
      set({ isLoading: false });
    }
  },

  markRead: async (notificationId: string): Promise<void> => {
    try {
      await notificationsApi.markRead(notificationId);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // Non-critical
    }
  },

  markAllRead: async (): Promise<void> => {
    try {
      await notificationsApi.markAllRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch {
      // Non-critical
    }
  },

  addNotification: (notification: Notification): void => {
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
