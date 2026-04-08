import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: { error: { code: string; message: string; details?: unknown } } = {
      error: {
        code: err.code,
        message: err.message,
      },
    };

    if ('details' in err && (err as AppError & { details?: unknown }).details !== undefined) {
      body.error.details = (err as AppError & { details?: unknown }).details;
    }

    res.status(err.statusCode).json(body);
    return;
  }

  logger.error({ err }, 'Unhandled error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
