import type { Server as HttpServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import { authenticateUpgrade } from './auth.js';
import type { PileoSocket } from './broadcast.js';
import { broadcastToBoard, leaveRoom, trackUser, untrackUser } from './broadcast.js';
import { WEBSOCKET_EVENTS } from '@pileo/shared';
import { handleJoin, handleLeave } from './handlers/board.handler.js';
import { handleTaskMessage } from './handlers/task.handler.js';
import { handleColumnMessage } from './handlers/column.handler.js';
import { handleCursorUpdate, broadcastPresenceLeave } from './handlers/presence.handler.js';

const HEARTBEAT_INTERVAL_MS = 30_000;

/** Zod schema for incoming WS messages */
const incomingMessageSchema = z.object({
  action: z.string().min(1),
  payload: z.record(z.unknown()).optional().default({}),
});

/**
 * Set up the WebSocket server attached to the given HTTP server.
 * Handles upgrade, authentication, heartbeat, and message routing.
 */
export function setupWebSocketServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade requests
  httpServer.on('upgrade', (req, socket, head) => {
    const userId = authenticateUpgrade(req);
    if (!userId) {
      logger.debug('WebSocket upgrade rejected: authentication failed');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      // Attach userId to the socket
      const pileoSocket = ws as PileoSocket;
      pileoSocket.userId = userId;
      pileoSocket.boardId = null;
      pileoSocket.isAlive = true;

      wss.emit('connection', pileoSocket, req);
    });
  });

  // Handle new connections
  wss.on('connection', (ws: PileoSocket) => {
    trackUser(ws);

    logger.info({ userId: ws.userId }, 'WebSocket client connected');

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      handleMessage(ws, data);
    });

    ws.on('close', () => {
      broadcastPresenceLeave(ws);
      leaveRoom(ws);
      untrackUser(ws);
      logger.info({ userId: ws.userId }, 'WebSocket client disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ err, userId: ws.userId }, 'WebSocket error');
    });
  });

  // Heartbeat: ping every 30s, close stale connections
  const heartbeatInterval = setInterval(() => {
    for (const client of wss.clients) {
      const ws = client as PileoSocket;
      if (!ws.isAlive) {
        logger.debug({ userId: ws.userId }, 'Terminating stale WebSocket connection');
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  logger.info('WebSocket server initialized');

  return wss;
}

function handleMessage(ws: PileoSocket, rawData: unknown): void {
  let text: string;
  if (typeof rawData === 'string') {
    text = rawData;
  } else if (Buffer.isBuffer(rawData)) {
    text = rawData.toString('utf-8');
  } else {
    logger.warn({ userId: ws.userId }, 'Received non-text WebSocket message');
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    sendError(ws, 'Invalid JSON');
    return;
  }

  const result = incomingMessageSchema.safeParse(parsed);
  if (!result.success) {
    sendError(ws, 'Invalid message format');
    return;
  }

  const { action, payload } = result.data;

  routeMessage(ws, action, payload);
}

function routeMessage(
  ws: PileoSocket,
  action: string,
  payload: Record<string, unknown>,
): void {
  switch (action) {
    case 'board:join': {
      const boardId = payload.boardId;
      if (typeof boardId !== 'string' || boardId.length === 0) {
        sendError(ws, 'Missing or invalid boardId');
        return;
      }
      handleJoin(ws, boardId).catch((err) => {
        logger.error({ err, userId: ws.userId }, 'Error handling board:join');
      });
      break;
    }

    case 'board:leave': {
      handleLeave(ws);
      break;
    }

    case 'presence:cursor': {
      const x = payload.x;
      const y = payload.y;
      if (typeof x !== 'number' || typeof y !== 'number') {
        sendError(ws, 'Invalid cursor payload');
        return;
      }
      handleCursorUpdate(ws, { x, y });
      break;
    }

    case 'presence:task:focus': {
      const taskId = payload.taskId ?? null;
      if (ws.boardId) {
        broadcastToBoard(
          ws.boardId,
          WEBSOCKET_EVENTS.PRESENCE_TASK_FOCUS,
          { userId: ws.userId, taskId },
          ws.userId,
        );
      }
      break;
    }

    case 'task:action': {
      const subAction = payload.action;
      if (typeof subAction !== 'string') {
        sendError(ws, 'Missing task action');
        return;
      }
      handleTaskMessage(ws, subAction, payload);
      break;
    }

    case 'column:action': {
      const subAction = payload.action;
      if (typeof subAction !== 'string') {
        sendError(ws, 'Missing column action');
        return;
      }
      handleColumnMessage(ws, subAction, payload);
      break;
    }

    default: {
      sendError(ws, `Unknown action: ${action}`);
    }
  }
}

function sendError(ws: PileoSocket, message: string): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ event: 'error', payload: { message } }));
  }
}
