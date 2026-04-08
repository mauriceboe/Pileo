import { create } from 'zustand';
import type { PresenceJoinPayload } from '@pileo/shared';

interface PresenceUser {
  userId: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
}

interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  updatedAt: number;
}

interface WebSocketState {
  connected: boolean;
  presenceUsers: PresenceUser[];
  cursors: Map<string, CursorPosition>;
  taskFocus: Map<string, string>; // userId → taskId
  wsInstance: WebSocket | null;

  setConnected: (connected: boolean) => void;
  setWsInstance: (ws: WebSocket | null) => void;
  sendCursor: (x: number, y: number) => void;
  setPresenceUsers: (users: PresenceUser[]) => void;
  addPresenceUser: (user: PresenceJoinPayload) => void;
  removePresenceUser: (userId: string) => void;
  clearPresence: () => void;
  updateCursor: (userId: string, x: number, y: number) => void;
  removeCursor: (userId: string) => void;
  setTaskFocus: (userId: string, taskId: string | null) => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  connected: false,
  presenceUsers: [],
  cursors: new Map(),
  taskFocus: new Map(),
  wsInstance: null,

  setWsInstance: (ws: WebSocket | null): void => { set({ wsInstance: ws }); },

  sendCursor: (x: number, y: number): void => {
    const { wsInstance } = useWebSocketStore.getState();
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      wsInstance.send(JSON.stringify({ action: 'presence:cursor', payload: { x, y } }));
    }
  },

  setConnected: (connected: boolean): void => {
    set({ connected });
  },

  setPresenceUsers: (users: PresenceUser[]): void => {
    set({ presenceUsers: users });
  },

  addPresenceUser: (user: PresenceJoinPayload): void => {
    set((state) => {
      // Avoid duplicates
      if (state.presenceUsers.some((u) => u.userId === user.userId)) {
        return state;
      }
      return {
        presenceUsers: [
          ...state.presenceUsers,
          {
            userId: user.userId,
            username: user.username,
            displayName: user.displayName,
            avatarPath: user.avatarPath,
          },
        ],
      };
    });
  },

  removePresenceUser: (userId: string): void => {
    set((state) => ({
      presenceUsers: state.presenceUsers.filter((u) => u.userId !== userId),
    }));
  },

  clearPresence: (): void => {
    set({ presenceUsers: [], cursors: new Map(), taskFocus: new Map() });
  },

  updateCursor: (userId: string, x: number, y: number): void => {
    set((state) => {
      const newCursors = new Map(state.cursors);
      newCursors.set(userId, { userId, x, y, updatedAt: Date.now() });
      return { cursors: newCursors };
    });
  },

  removeCursor: (userId: string): void => {
    set((state) => {
      const newCursors = new Map(state.cursors);
      newCursors.delete(userId);
      return { cursors: newCursors };
    });
  },

  setTaskFocus: (userId: string, taskId: string | null): void => {
    set((state) => {
      const newFocus = new Map(state.taskFocus);
      if (taskId) {
        newFocus.set(userId, taskId);
      } else {
        newFocus.delete(userId);
      }
      return { taskFocus: newFocus };
    });
  },
}));
