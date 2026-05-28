import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import express from 'express';
import session from 'express-session';
import WebSocket from 'ws';
import { setupWebSocketServer } from '../../websocket/server.js';
import type { WebSocketServer } from 'ws';

// Real ws + real http server, no Nest — verifies the WS upgrade path
// rejects connections that don't carry a Pileo session cookie.

describe('websocket auth integration', () => {
  let httpServer: HttpServer;
  let wss: WebSocketServer;
  let port: number;

  beforeAll(async () => {
    const app = express();
    app.use(session({
      secret: 'ws-integration-test-secret-32-chars-or-more',
      resave: false,
      saveUninitialized: false,
      name: 'pileo.sid',
    }));
    httpServer = createServer(app);
    wss = setupWebSocketServer(httpServer);
    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const address = httpServer.address();
    port = typeof address === 'object' && address ? address.port : 0;
  });

  afterAll(async () => {
    wss.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('rejects upgrade requests without a session cookie', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const result = await new Promise<{ code?: number; closed: boolean }>((resolve) => {
      const closeFn = (code?: number) => resolve({ code, closed: true });
      ws.on('unexpected-response', (_req, res) => {
        resolve({ code: res.statusCode, closed: false });
        ws.terminate();
      });
      ws.on('error', () => closeFn());
      ws.on('close', closeFn);
    });
    expect(result.code === 401 || result.code === 1006 || result.closed).toBe(true);
  });
});
