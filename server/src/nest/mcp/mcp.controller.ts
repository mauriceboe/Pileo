import {
  All,
  Controller,
  HttpStatus,
  Logger,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { authenticateMcpRequest } from './mcp-auth.js';
import {
  mcpSessions,
  MAX_SESSIONS_PER_USER,
  type McpSession,
} from './session-manager.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { RateLimiter } from './rate-limit.js';

// JSON body parser scoped to this controller. The top-level dispatcher in
// index.ts forwards raw requests to Nest (bodyParser: false), so the MCP
// controller has to parse its own input — keeps the legacy Express stack
// untouched.
const jsonBody = express.json({ limit: '1mb' });
function parseJson(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    jsonBody(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

// Per-user-per-minute rate cap. See rate-limit.ts for the implementation.
const rateLimiter = new RateLimiter({ windowMs: 60 * 1000, max: 300 });

@Controller('api/v1/mcp')
export class McpController {
  private readonly logger = new Logger('McpController');

  constructor() {
    mcpSessions.startSweeper();
  }

  // Single handler for POST (initialize / tool call), GET (SSE stream), and
  // DELETE (session close). The MCP StreamableHTTP transport handles the
  // protocol details — we just gate on auth, rate limit, and session lookup.
  @All()
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    const auth = await authenticateMcpRequest(req);
    if (!auth) {
      // RFC 9728: point clients at the protected-resource metadata so they
      // can discover the authorization server without out-of-band config.
      const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? req.protocol;
      const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers['host'];
      const resourceMeta = `${proto}://${host}/.well-known/oauth-protected-resource/api/v1/mcp`;
      res.setHeader(
        'WWW-Authenticate',
        `Bearer realm="Pileo MCP", resource_metadata="${resourceMeta}", error="invalid_token"`,
      );
      res.status(HttpStatus.UNAUTHORIZED).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }
    const { userId, projectId } = auth;

    if (rateLimiter.isLimited(userId)) {
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
      });
      return;
    }

    // POST is the only verb that may carry a JSON body — parse it eagerly
    // so both the session-id branch and the new-session branch see it.
    if (req.method === 'POST') {
      try {
        await parseJson(req, res);
      } catch (err) {
        this.logger.warn(`Failed to parse JSON body: ${(err as Error).message}`);
        res.status(HttpStatus.BAD_REQUEST).json({
          error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' },
        });
        return;
      }
    }

    const sessionId = req.headers['mcp-session-id'];
    const sid = typeof sessionId === 'string' ? sessionId : undefined;

    if (sid) {
      const session = mcpSessions.get(sid);
      if (!session) {
        res.status(HttpStatus.NOT_FOUND).json({
          error: { code: 'NOT_FOUND', message: 'MCP session not found' },
        });
        return;
      }
      if (session.userId !== userId) {
        res.status(HttpStatus.FORBIDDEN).json({
          error: { code: 'FORBIDDEN', message: 'Session belongs to a different user' },
        });
        return;
      }
      session.lastActivity = Date.now();
      await this.forwardToTransport(session, req, res);
      return;
    }

    // Only POST can initialize a new session.
    if (req.method !== 'POST') {
      res.status(HttpStatus.BAD_REQUEST).json({
        error: { code: 'BAD_REQUEST', message: 'Missing mcp-session-id header' },
      });
      return;
    }

    if (mcpSessions.countForUser(userId) >= MAX_SESSIONS_PER_USER) {
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        error: {
          code: 'SESSION_LIMIT',
          message: 'Session limit reached. Close an existing session before opening a new one.',
        },
      });
      return;
    }

    const newSession = this.buildSession(userId, projectId);
    await newSession.server.connect(newSession.transport);
    await this.forwardToTransport(newSession, req, res);
  }

  private async forwardToTransport(
    session: McpSession,
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      // POST hands a parsed body to the transport; GET/DELETE just stream.
      const body = req.method === 'POST' ? req.body : undefined;
      await session.transport.handleRequest(req, res, body);
    } catch (err) {
      this.logger.error(`MCP transport error: ${(err as Error).message}`);
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: { code: 'INTERNAL_ERROR', message: 'Internal MCP error' },
        });
      }
    }
  }

  private buildSession(userId: string, projectId: string): McpSession {
    const server = new McpServer(
      { name: 'Pileo MCP', version: '1.0.0' },
      {
        capabilities: {
          resources: { listChanged: false },
          tools: { listChanged: false },
        },
      },
    );

    registerTools(server, userId);
    registerResources(server, userId);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        mcpSessions.add(sid, session);
        this.logger.log(
          `Session ${sid} created for user ${userId}. Active: ${mcpSessions.size()}`,
        );
      },
      onsessionclosed: (sid) => {
        mcpSessions.delete(sid);
      },
    });

    const session: McpSession = {
      server,
      transport,
      userId,
      projectId,
      lastActivity: Date.now(),
    };
    return session;
  }
}
