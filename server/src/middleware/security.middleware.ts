import helmet from 'helmet';
import cors from 'cors';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

export function createHelmetMiddleware(): RequestHandler {
  return helmet({
    contentSecurityPolicy: env.PILEO_NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }) as RequestHandler;
}

export function createCorsMiddleware(): RequestHandler {
  return cors({
    origin: env.PILEO_CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
