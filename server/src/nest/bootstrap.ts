import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import type { Express, Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pinoHttp from 'pino-http';
import { AppModule } from './app.module.js';
import { AppErrorFilter } from './error/app-error.filter.js';
import { createSessionMiddleware } from '../config/session.js';
import { createHelmetMiddleware, createCorsMiddleware } from '../middleware/security.middleware.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export interface NestHandle {
  instance: Express;
  close: () => Promise<void>;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Top-level NestJS app. This is the only HTTP handler now — the legacy
// Express stack has been retired.
export async function createNestApp(): Promise<NestHandle> {
  const expressInstance = express();

  // Behind a TLS-terminating reverse proxy, we need X-Forwarded-Proto so
  // express-session can set secure cookies. Default to on in production.
  const trustProxy = env.PILEO_TRUST_PROXY ?? env.PILEO_NODE_ENV === 'production';
  if (trustProxy) expressInstance.set('trust proxy', 1);
  expressInstance.disable('x-powered-by');

  // Health endpoint sits in front of Nest so container probes don't
  // depend on the Nest boot completing.
  expressInstance.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', version: '1.0.0' });
  });

  expressInstance.use(createHelmetMiddleware());
  expressInstance.use(createCorsMiddleware());
  expressInstance.use(pinoHttp({ logger }));
  expressInstance.use(createSessionMiddleware());
  expressInstance.use('/uploads', express.static(path.resolve(env.PILEO_UPLOAD_DIR)));

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressInstance),
    { logger: ['error', 'warn', 'log'], bodyParser: true },
  );

  app.useGlobalFilters(new AppErrorFilter());
  await app.init();

  // SPA fallback in production. Registered AFTER Nest so controllers own
  // /api/*, /.well-known/* and /uploads/*; everything else falls through
  // to index.html.
  if (env.PILEO_NODE_ENV === 'production') {
    const clientDist = path.join(currentDir, '../../../client/dist');
    expressInstance.use(express.static(clientDist));
    expressInstance.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/.well-known/')) {
        next();
        return;
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return {
    instance: expressInstance,
    close: () => app.close(),
  };
}
