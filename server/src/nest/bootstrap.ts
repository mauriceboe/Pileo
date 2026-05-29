import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import type { Express, Request, Response } from 'express';
import path from 'node:path';
import { readFileSync } from 'node:fs';
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

// Read version from the server's package.json at boot. In the container the
// file ships alongside the compiled JS in `/app/server/package.json`; in dev
// (running from src/) the resolved path is `server/package.json`.
const APP_VERSION = ((): string => {
  const candidates = [
    path.join(currentDir, '../../package.json'),
    path.join(currentDir, '../../../package.json'),
  ];
  for (const candidate of candidates) {
    try {
      const pkg = JSON.parse(readFileSync(candidate, 'utf-8')) as { version?: string };
      if (pkg.version) return pkg.version;
    } catch {
      // try next candidate
    }
  }
  return '0.0.0';
})();

// Top-level NestJS app. This is the only HTTP handler now — the legacy
// Express stack has been retired.
export async function createNestApp(): Promise<NestHandle> {
  const expressInstance = express();

  // Behind a TLS-terminating reverse proxy, we need X-Forwarded-Proto so
  // express-session can set secure cookies. Default to on in production.
  const trustProxy = env.PILEO_TRUST_PROXY ?? env.PILEO_NODE_ENV === 'production';
  if (trustProxy) expressInstance.set('trust proxy', 1);
  expressInstance.disable('x-powered-by');

  // Health + version endpoints sit in front of Nest so container probes don't
  // depend on the Nest boot completing. `/api/health` stays unversioned for
  // container probes; the version endpoint is also exposed under the SPA's
  // `/api/v1` prefix so the apiClient hook can reach it without a special case.
  expressInstance.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', version: APP_VERSION });
  });
  const versionHandler = (_req: Request, res: Response): void => {
    res.json({ data: { version: APP_VERSION } });
  };
  expressInstance.get('/api/version', versionHandler);
  expressInstance.get('/api/v1/version', versionHandler);

  expressInstance.use(createHelmetMiddleware());
  expressInstance.use(createCorsMiddleware());
  expressInstance.use(pinoHttp({ logger }));
  expressInstance.use(createSessionMiddleware());
  expressInstance.use('/uploads', express.static(path.resolve(env.PILEO_UPLOAD_DIR)));

  // SPA assets + fallback. Registered BEFORE Nest so the index.html
  // fallback wins over Nest's NotFoundException, which AppErrorFilter
  // would otherwise serialise as a JSON 404 for the browser request to /.
  // express.static calls next() when no file matches, so /api/* and
  // /.well-known/* still reach the Nest controllers below.
  if (env.PILEO_NODE_ENV === 'production') {
    const clientDist = path.join(currentDir, '../../../client/dist');
    expressInstance.use(express.static(clientDist));
    expressInstance.get(/^(?!\/api\/|\/\.well-known\/|\/uploads\/).*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressInstance),
    { logger: ['error', 'warn', 'log'], bodyParser: true },
  );

  app.useGlobalFilters(new AppErrorFilter());
  await app.init();

  return {
    instance: expressInstance,
    close: () => app.close(),
  };
}
