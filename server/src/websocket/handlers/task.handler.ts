import { WEBSOCKET_EVENTS } from '@pileo/shared';
import type { PileoSocket } from '../broadcast.js';
import { broadcastToBoard } from '../broadcast.js';

/**
 * Broadcast a task:created event to the board room.
 * Called from task.service after a task is created.
 */
export function broadcastTaskCreated(
  boardId: string,
  task: unknown,
  excludeUserId?: string,
): void {
  broadcastToBoard(boardId, WEBSOCKET_EVENTS.TASK_CREATED, task, excludeUserId);
}

/**
 * Broadcast a task:updated event to the board room.
 */
export function broadcastTaskUpdated(
  boardId: string,
  task: unknown,
  excludeUserId?: string,
): void {
  broadcastToBoard(boardId, WEBSOCKET_EVENTS.TASK_UPDATED, task, excludeUserId);
}

/**
 * Broadcast a task:deleted event to the board room.
 */
export function broadcastTaskDeleted(
  boardId: string,
  taskId: string,
  excludeUserId?: string,
): void {
  broadcastToBoard(boardId, WEBSOCKET_EVENTS.TASK_DELETED, { taskId }, excludeUserId);
}

/**
 * Broadcast a task:moved event to the board room.
 */
export function broadcastTaskMoved(
  boardId: string,
  payload: {
    taskId: string;
    fromColumnId: string;
    toColumnId: string;
    position: number;
  },
  excludeUserId?: string,
): void {
  broadcastToBoard(boardId, WEBSOCKET_EVENTS.TASK_MOVED, payload, excludeUserId);
}

/**
 * Handle an incoming WS message for task-related actions.
 * Currently task mutations go through REST; this is a placeholder for
 * future direct-WS task operations.
 */
export function handleTaskMessage(
  _ws: PileoSocket,
  _action: string,
  _payload: unknown,
): void {
  // Task mutations are handled via REST API + service-level broadcast.
  // This handler exists for potential future WS-only task operations.
}
