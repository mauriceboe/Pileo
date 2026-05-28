import 'reflect-metadata';
import { createServer } from 'node:http';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { createApp } from './app.js';
import { sqlite } from './config/database.js';
import { initializeDatabase } from './db/init.js';
import { setupWebSocketServer } from './websocket/server.js';
import { createNestApp } from './nest/bootstrap.js';
import { compileMatchers } from './nest/dispatcher.js';

async function start(): Promise<void> {
  try {
    sqlite.pragma('integrity_check');
    logger.info('Database connection established');
    initializeDatabase();
  } catch (err) {
    logger.fatal({ err }, 'Failed to open database');
    process.exit(1);
  }

  const legacyApp = createApp();
  const nest = await createNestApp();

  // Top-level dispatcher: every HTTP request hits this Express instance,
  // which forwards to Nest for configured prefixes and Legacy for the rest.
  // Keeping both apps behind one HTTP server lets WebSocket upgrades and
  // existing middleware (proxy trust, error handling) continue to work.
  const dispatcher = express();
  if (env.PILEO_TRUST_PROXY ?? env.PILEO_NODE_ENV === 'production') {
    dispatcher.set('trust proxy', 1);
  }
  dispatcher.disable('x-powered-by');

  const nestPrefixes = env.PILEO_NEST_PREFIXES;
  // Compile pattern matchers once at startup — request-time matching is then
  // O(n) over a tiny array of pre-built regex.tests instead of re-parsing.
  const matchers = compileMatchers(nestPrefixes);
  dispatcher.use((req: Request, res: Response, next: NextFunction) => {
    if (matchers.length > 0 && matchers.some((m) => m.test(req.path))) {
      nest.instance(req, res, next);
    } else {
      legacyApp(req, res, next);
    }
  });

  const server = createServer(dispatcher);
  const wss = setupWebSocketServer(server);

  server.listen(env.PILEO_PORT, env.PILEO_HOST, () => {
    logger.info(
      {
        host: env.PILEO_HOST,
        port: env.PILEO_PORT,
        env: env.PILEO_NODE_ENV,
        nestPrefixes: nestPrefixes.length > 0 ? nestPrefixes : '(none, all routes on legacy Express)',
      },
      `Pileo server listening on ${env.PILEO_HOST}:${env.PILEO_PORT}`,
    );
  });

  const shutdown = (): void => {
    logger.info('Shutting down gracefully...');
    wss.close(() => {
      logger.info('WebSocket server closed');
    });
    server.close(async () => {
      try {
        await nest.close();
        logger.info('Nest application closed');
        sqlite.close();
        logger.info('Database connection closed');
        process.exit(0);
      } catch (err: unknown) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
  });
}

start().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
