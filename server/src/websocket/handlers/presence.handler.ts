import { WEBSOCKET_EVENTS } from '@pileo/shared';
import type { PileoSocket } from '../broadcast.js';
import { broadcastToBoard } from '../broadcast.js';

/**
 * Handle a presence:cursor update from a client.
 * Broadcasts the cursor position to all other clients in the same board room.
 */
export function handleCursorUpdate(
  ws: PileoSocket,
  payload: { x: number; y: number },
): void {
  if (!ws.boardId) return;

  broadcastToBoard(
    ws.boardId,
    WEBSOCKET_EVENTS.PRESENCE_CURSOR,
    {
      userId: ws.userId,
      x: payload.x,
      y: payload.y,
    },
    ws.userId,
  );
}

/**
 * Broadcast a presence:leave event when a user disconnects.
 */
export function broadcastPresenceLeave(ws: PileoSocket): void {
  if (!ws.boardId) return;

  broadcastToBoard(
    ws.boardId,
    WEBSOCKET_EVENTS.PRESENCE_LEAVE,
    { userId: ws.userId },
  );
}
