import { WEBSOCKET_EVENTS } from '@pileo/shared';
import type { PileoSocket } from '../broadcast.js';
import { joinRoom, leaveRoom, broadcastToBoard, getRoomUsers } from '../broadcast.js';
import { db } from '../../config/database.js';
import { users } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { logger } from '../../config/logger.js';

export async function handleJoin(ws: PileoSocket, boardId: string): Promise<void> {
  joinRoom(ws, boardId);

  // Fetch user info for presence announcement
  const userRows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarPath: users.avatarPath,
    })
    .from(users)
    .where(eq(users.id, ws.userId))
    .limit(1);

  const user = userRows[0];
  if (!user) {
    logger.warn({ userId: ws.userId }, 'User not found during board join');
    return;
  }

  // Broadcast presence:join to others in the room
  broadcastToBoard(
    boardId,
    WEBSOCKET_EVENTS.PRESENCE_JOIN,
    {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarPath: user.avatarPath,
    },
    ws.userId,
  );

  // Send current room users to the joining client
  const roomUserIds = getRoomUsers(boardId);
  if (roomUserIds.length > 0) {
    const roomUsers = await db
      .select({
        userId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarPath: users.avatarPath,
      })
      .from(users)
      .where(
        // SQLite: use IN with known IDs
        eq(users.id, roomUserIds[0]!),
      );

    // If more than one user, fetch all
    let allRoomUsers = roomUsers;
    if (roomUserIds.length > 1) {
      const { inArray } = await import('drizzle-orm');
      allRoomUsers = await db
        .select({
          userId: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarPath: users.avatarPath,
        })
        .from(users)
        .where(inArray(users.id, roomUserIds));
    }

    const message = JSON.stringify({
      event: 'presence:list',
      payload: { users: allRoomUsers },
      boardId,
      timestamp: new Date().toISOString(),
    });

    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}

export function handleLeave(ws: PileoSocket): void {
  const boardId = ws.boardId;
  if (!boardId) return;

  leaveRoom(ws);

  broadcastToBoard(
    boardId,
    WEBSOCKET_EVENTS.PRESENCE_LEAVE,
    { userId: ws.userId },
  );
}
