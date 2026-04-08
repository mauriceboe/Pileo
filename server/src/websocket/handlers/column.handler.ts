import { WEBSOCKET_EVENTS } from '@pileo/shared';
import { broadcastToBoard } from '../broadcast.js';
import type { PileoSocket } from '../broadcast.js';

/**
 * Broadcast a column:created event to the board room.
 */
export function broadcastColumnCreated(
  boardId: string,
  column: unknown,
  excludeUserId?: string,
): void {
  broadcastToBoard(boardId, WEBSOCKET_EVENTS.COLUMN_CREATED, column, excludeUserId);
}

/**
 * Broadcast a column:updated event to the board room.
 */
export function broadcastColumnUpdated(
  boardId: string,
  column: unknown,
  excludeUserId?: string,
): void {
  broadcastToBoard(boardId, WEBSOCKET_EVENTS.COLUMN_UPDATED, column, excludeUserId);
}

/**
 * Broadcast a column:deleted event to the board room.
 */
export function broadcastColumnDeleted(
  boardId: string,
  columnId: string,
  excludeUserId?: string,
): void {
  broadcastToBoard(boardId, WEBSOCKET_EVENTS.COLUMN_DELETED, { columnId }, excludeUserId);
}

/**
 * Broadcast a column:reordered event to the board room.
 */
export function broadcastColumnReordered(
  boardId: string,
  columnIds: string[],
  excludeUserId?: string,
): void {
  broadcastToBoard(boardId, WEBSOCKET_EVENTS.COLUMN_REORDERED, { columnIds }, excludeUserId);
}

/**
 * Handle an incoming WS message for column-related actions.
 * Column mutations go through REST; this is reserved for future use.
 */
export function handleColumnMessage(
  _ws: PileoSocket,
  _action: string,
  _payload: unknown,
): void {
  // Column mutations are handled via REST API + service-level broadcast.
}
