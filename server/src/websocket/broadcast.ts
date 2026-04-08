import type { WebSocket } from 'ws';
import type { WebSocketEventName } from '@pileo/shared';
import { logger } from '../config/logger.js';

export interface PileoSocket extends WebSocket {
  userId: string;
  boardId: string | null;
  isAlive: boolean;
}

/** Map of boardId -> Set of connected sockets */
const rooms = new Map<string, Set<PileoSocket>>();

/** Map of userId -> Set of sockets (a user can have multiple tabs) */
const userSockets = new Map<string, Set<PileoSocket>>();

export function joinRoom(ws: PileoSocket, boardId: string): void {
  // Leave current room first
  if (ws.boardId) {
    leaveRoom(ws);
  }

  ws.boardId = boardId;

  let room = rooms.get(boardId);
  if (!room) {
    room = new Set();
    rooms.set(boardId, room);
  }
  room.add(ws);

  logger.debug({ userId: ws.userId, boardId }, 'Client joined board room');
}

export function leaveRoom(ws: PileoSocket): void {
  if (!ws.boardId) return;

  const room = rooms.get(ws.boardId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) {
      rooms.delete(ws.boardId);
    }
  }

  logger.debug({ userId: ws.userId, boardId: ws.boardId }, 'Client left board room');
  ws.boardId = null;
}

export function trackUser(ws: PileoSocket): void {
  let sockets = userSockets.get(ws.userId);
  if (!sockets) {
    sockets = new Set();
    userSockets.set(ws.userId, sockets);
  }
  sockets.add(ws);
}

export function untrackUser(ws: PileoSocket): void {
  const sockets = userSockets.get(ws.userId);
  if (sockets) {
    sockets.delete(ws);
    if (sockets.size === 0) {
      userSockets.delete(ws.userId);
    }
  }
}

/**
 * Broadcast an event to all clients in a board room.
 * Optionally exclude a specific userId (e.g., the originator).
 */
export function broadcastToBoard(
  boardId: string,
  event: WebSocketEventName,
  payload: unknown,
  excludeUserId?: string,
): void {
  const room = rooms.get(boardId);
  if (!room || room.size === 0) return;

  const message = JSON.stringify({
    event,
    payload,
    boardId,
    timestamp: new Date().toISOString(),
  });

  for (const client of room) {
    if (excludeUserId && client.userId === excludeUserId) continue;
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }

  logger.debug({ boardId, event, recipients: room.size }, 'Broadcast to board');
}

/**
 * Send an event to all sockets belonging to a specific user.
 */
export function sendToUser(
  userId: string,
  event: WebSocketEventName,
  payload: unknown,
): void {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return;

  const message = JSON.stringify({
    event,
    payload,
    timestamp: new Date().toISOString(),
  });

  for (const client of sockets) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }

  logger.debug({ userId, event }, 'Sent to user');
}

/**
 * Get all user IDs currently present in a board room.
 */
export function getRoomUsers(boardId: string): string[] {
  const room = rooms.get(boardId);
  if (!room) return [];

  const userIds = new Set<string>();
  for (const client of room) {
    userIds.add(client.userId);
  }
  return Array.from(userIds);
}

/**
 * Get the room map (for use by handlers).
 */
export function getRoom(boardId: string): Set<PileoSocket> | undefined {
  return rooms.get(boardId);
}
