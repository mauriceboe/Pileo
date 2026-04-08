import { useEffect, useRef, useCallback } from 'react';
import { WEBSOCKET_EVENTS } from '@pileo/shared';
import type { WebSocketEventName, Column, Notification } from '@pileo/shared';
import { useWebSocketStore } from '../stores/websocket.store';
import { useBoardStore } from '../stores/board.store';
import { useNotificationStore } from '../stores/notification.store';
// tasks.api imported dynamically in event handlers

const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

interface WsMessage {
  event: string;
  payload: unknown;
  boardId?: string;
  timestamp?: string;
}

export function useWebSocket(boardId: string | undefined): void {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardIdRef = useRef(boardId);

  const setConnected = useWebSocketStore((s) => s.setConnected);
  const addPresenceUser = useWebSocketStore((s) => s.addPresenceUser);
  const removePresenceUser = useWebSocketStore((s) => s.removePresenceUser);
  const setPresenceUsers = useWebSocketStore((s) => s.setPresenceUsers);
  const clearPresence = useWebSocketStore((s) => s.clearPresence);
  const updateCursor = useWebSocketStore((s) => s.updateCursor);
  const removeCursor = useWebSocketStore((s) => s.removeCursor);
  const setTaskFocus = useWebSocketStore((s) => s.setTaskFocus);

  // Keep boardId ref in sync
  boardIdRef.current = boardId;

  const handleMessage = useCallback(
    (data: string) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(data) as WsMessage;
      } catch {
        return;
      }

      const { event, payload, boardId: msgBoardId } = msg;

      // Ignore events from other boards (stale connections, race conditions)
      const currentBoardId = boardIdRef.current;
      if (msgBoardId && currentBoardId && msgBoardId !== currentBoardId) return;

      switch (event as WebSocketEventName | 'presence:list' | 'error') {
        case WEBSOCKET_EVENTS.TASK_CREATED: {
          const boardForCreate = useBoardStore.getState().board;
          if (boardForCreate) {
            import('../api/tasks.api').then((tasksApi) => {
              tasksApi.listTasks(boardForCreate.id).then((tasksByColumn) => {
                useBoardStore.setState({ tasksByColumn });
              });
            });
          }
          break;
        }

        case WEBSOCKET_EVENTS.TASK_UPDATED: {
          // Re-fetch all tasks to get correct counts (links, comments, checklists, etc.)
          const boardForUpdate = useBoardStore.getState().board;
          if (boardForUpdate) {
            import('../api/tasks.api').then((tasksApi) => {
              tasksApi.listTasks(boardForUpdate.id).then((tasksByColumn) => {
                useBoardStore.setState({ tasksByColumn });
              });
            });
          }
          break;
        }

        case WEBSOCKET_EVENTS.TASK_DELETED: {
          const { taskId } = payload as { taskId: string };
          // Close detail if deleted task was open
          useBoardStore.setState((state) => ({
            isTaskDetailOpen: state.selectedTaskId === taskId ? false : state.isTaskDetailOpen,
            selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
            selectedTask: state.selectedTaskId === taskId ? null : state.selectedTask,
            }));
          // Re-fetch tasks
          const boardForDelete = useBoardStore.getState().board;
          if (boardForDelete) {
            import('../api/tasks.api').then((tasksApi) => {
              tasksApi.listTasks(boardForDelete.id).then((tasksByColumn) => {
                useBoardStore.setState({ tasksByColumn });
              });
            });
          }
          break;
        }

        case WEBSOCKET_EVENTS.TASK_MOVED: {
          // Re-fetch all tasks to get correct completedAt from column rules
          const board = useBoardStore.getState().board;
          if (board) {
            import('../api/tasks.api').then((tasksApi) => {
              tasksApi.listTasks(board.id).then((tasksByColumn) => {
                useBoardStore.setState({ tasksByColumn });
              });
            });
          }
          break;
        }

        case WEBSOCKET_EVENTS.COLUMN_CREATED: {
          const column = payload as Column;
          useBoardStore.setState((state) => {
            if (!state.board) return state;
            return {
              board: {
                ...state.board,
                columns: [...state.board.columns, column],
              },
              tasksByColumn: {
                ...state.tasksByColumn,
                [column.id]: [],
              },
            };
          });
          break;
        }

        case WEBSOCKET_EVENTS.COLUMN_UPDATED: {
          const column = payload as Column;
          const columnId = column.id;
          useBoardStore.setState((state) => {
            if (!state.board) return state;
            return {
              board: {
                ...state.board,
                columns: state.board.columns.map((c) =>
                  c.id === columnId ? column : c,
                ),
              },
            };
          });
          break;
        }

        case WEBSOCKET_EVENTS.COLUMN_DELETED: {
          const { columnId } = payload as { columnId: string };
          useBoardStore.setState((state) => {
            if (!state.board) return state;
            const { [columnId]: _removed, ...remainingTasks } =
              state.tasksByColumn;
            return {
              board: {
                ...state.board,
                columns: state.board.columns.filter((c) => c.id !== columnId),
              },
              tasksByColumn: remainingTasks,
            };
          });
          break;
        }

        case WEBSOCKET_EVENTS.COLUMN_REORDERED: {
          const { columnIds } = payload as { columnIds: string[] };
          useBoardStore.setState((state) => {
            if (!state.board) return state;
            const columnMap = new Map(
              state.board.columns.map((c) => [c.id, c]),
            );
            const reordered = columnIds
              .map((id) => columnMap.get(id))
              .filter((c): c is Column => c !== undefined);
            return {
              board: { ...state.board, columns: reordered },
            };
          });
          break;
        }

        case WEBSOCKET_EVENTS.PRESENCE_JOIN: {
          const user = payload as {
            userId: string;
            username: string;
            displayName: string;
            avatarPath: string | null;
          };
          addPresenceUser(user);
          break;
        }

        case WEBSOCKET_EVENTS.PRESENCE_LEAVE: {
          const { userId } = payload as { userId: string };
          removePresenceUser(userId);
          removeCursor(userId);
          setTaskFocus(userId, null);
          break;
        }

        case WEBSOCKET_EVENTS.PRESENCE_CURSOR: {
          const { userId, x, y } = payload as { userId: string; x: number; y: number };
          updateCursor(userId, x, y);
          break;
        }

        case WEBSOCKET_EVENTS.PRESENCE_TASK_FOCUS: {
          const { userId, taskId: focusedTaskId } = payload as { userId: string; taskId: string | null };
          setTaskFocus(userId, focusedTaskId);
          break;
        }

        case WEBSOCKET_EVENTS.NOTIFICATION_NEW: {
          const notification = payload as Notification;
          useNotificationStore.getState().addNotification(notification);
          break;
        }

        case 'presence:list': {
          const { users } = payload as {
            users: Array<{
              userId: string;
              username: string;
              displayName: string;
              avatarPath: string | null;
            }>;
          };
          setPresenceUsers(users);
          break;
        }

        default:
          break;
      }
    },
    [addPresenceUser, removePresenceUser, setPresenceUsers],
  );

  const connect = useCallback(() => {
    const currentBoard = boardIdRef.current;
    if (!currentBoard) return;

    // Build WS URL from current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    useWebSocketStore.getState().setWsInstance(ws);

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setConnected(true);

      // Join the board room using the ref (not stale closure)
      const boardToJoin = boardIdRef.current;
      if (boardToJoin) {
        ws.send(
          JSON.stringify({ action: 'board:join', payload: { boardId: boardToJoin } }),
        );
      }
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        handleMessage(event.data);
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      setConnected(false);

      // Only reconnect if we still have a boardId
      if (boardIdRef.current) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror, triggering reconnect
    };
  }, [handleMessage, setConnected]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) return;

    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptRef.current),
      MAX_RECONNECT_DELAY_MS,
    );
    reconnectAttemptRef.current += 1;

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connect();
    }, delay);
  }, [connect]);

  // Connect when boardId changes
  useEffect(() => {
    if (!boardId) return;

    connect();

    return () => {
      // Cleanup on unmount or boardId change
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      const ws = wsRef.current;
      if (ws) {
        // Send leave before closing
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: 'board:leave', payload: {} }));
        }
        ws.close();
        wsRef.current = null;
      }

      clearPresence();
      setConnected(false);
    };
  }, [boardId, connect, clearPresence, setConnected]);
}
