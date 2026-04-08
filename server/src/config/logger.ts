import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.PILEO_LOG_LEVEL,
  transport: env.PILEO_NODE_ENV === 'development'
    ? { target: 'pino/file', options: { destination: 1 } }
    : undefined,
});
