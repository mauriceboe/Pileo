import { createServer } from 'node:http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { sqlite } from './config/database.js';
import { initializeDatabase } from './db/init.js';
import { setupWebSocketServer } from './websocket/server.js';
import { createNestApp } from './nest/bootstrap.js';

async function start(): Promise<void> {
  try {
    sqlite.pragma('integrity_check');
    logger.info('Database connection established');
    initializeDatabase();
  } catch (err) {
    logger.fatal({ err }, 'Failed to open database');
    process.exit(1);
  }

  const nest = await createNestApp();
  const server = createServer(nest.instance);
  const wss = setupWebSocketServer(server);

  server.listen(env.PILEO_PORT, env.PILEO_HOST, () => {
    logger.info(
      { host: env.PILEO_HOST, port: env.PILEO_PORT, env: env.PILEO_NODE_ENV },
      `Pileo server listening on ${env.PILEO_HOST}:${env.PILEO_PORT}`,
    );
  });

  const shutdown = (): void => {
    logger.info('Shutting down gracefully...');
    wss.close(() => logger.info('WebSocket server closed'));
    server.close(async () => {
      try {
        await nest.close();
        logger.info('Nest application closed');
        sqlite.close();
        logger.info('Database connection closed');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('unhandledRejection', (reason) => logger.error({ err: reason }, 'Unhandled promise rejection'));
  process.on('uncaughtException', (err) => logger.error({ err }, 'Uncaught exception'));
}

start().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
