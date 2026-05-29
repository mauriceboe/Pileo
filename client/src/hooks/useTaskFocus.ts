import { useWebSocketStore } from '../stores/websocket.store';
import { useAuthStore } from '../stores/auth.store';
import { getFocusColor } from '../utils/focus-color';

export interface FocusedByUser {
  userId: string;
  name: string;
  color: string;
}

/**
 * Returns the (other) user currently focused on this task, if any.
 * Used to draw the presence outline + name tag on a task card.
 */
export function useTaskFocus(taskId: string): FocusedByUser | null {
  const taskFocus = useWebSocketStore((s) => s.taskFocus);
  const presenceUsers = useWebSocketStore((s) => s.presenceUsers);
  const currentUserId = useAuthStore((s) => s.user?.id);

  for (const [userId, focusedTaskId] of taskFocus) {
    if (focusedTaskId === taskId && userId !== currentUserId) {
      const user = presenceUsers.find((u) => u.userId === userId);
      return {
        userId,
        name: user?.displayName || user?.username || '?',
        color: getFocusColor(userId),
      };
    }
  }
  return null;
}
