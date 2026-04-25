import express, { type Request, type Response, type NextFunction } from 'express';
import { createRequire } from 'node:module';

// Patch Express Router to catch async errors (Express 4 doesn't do this)
const esmRequire = createRequire(import.meta.url);
const Layer = esmRequire('express/lib/router/layer');
const originalHandle = Layer.prototype.handle_request;
Layer.prototype.handle_request = function (this: any, req: Request, res: Response, next: NextFunction) {
  const result = originalHandle.call(this, req, res, next);
  if (result && typeof result.catch === 'function') {
    result.catch(next);
  }
  return result;
};
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pinoHttp from 'pino-http';
import { createHelmetMiddleware, createCorsMiddleware } from './middleware/security.middleware.js';
import { createSessionMiddleware } from './config/session.js';
import { logger } from './config/logger.js';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';

import { env } from './config/env.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export function createApp(): express.Application {
  const app = express();

  // Behind a TLS-terminating reverse proxy, Express needs to honour
  // X-Forwarded-Proto so express-session sets the secure cookie. Default
  // to enabled in production (where a proxy is the norm); explicit override
  // via PILEO_TRUST_PROXY remains supported.
  const trustProxy = env.PILEO_TRUST_PROXY ?? env.PILEO_NODE_ENV === 'production';
  if (trustProxy) {
    app.set('trust proxy', 1);
  }

  // Health endpoint — no auth required
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
  });

  app.use(createHelmetMiddleware());
  app.use(createCorsMiddleware());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(pinoHttp({ logger }));
  app.use(createSessionMiddleware());

  // Serve uploaded files
  app.use('/uploads', express.static(path.resolve(env.PILEO_UPLOAD_DIR)));

  app.use('/api/v1', registerRoutes());

  app.use(errorHandler);

  // Serve client static files in production
  if (env.PILEO_NODE_ENV === 'production') {
    const clientDist = path.join(currentDir, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
