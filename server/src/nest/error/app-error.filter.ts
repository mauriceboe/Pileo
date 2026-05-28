import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from '../../utils/errors.js';

// Mirrors server/src/middleware/error.middleware.ts exactly so a Nest
// controller throwing a legacy Pileo error serialises to the same
// {error: {code, message, details?}} envelope as an Express controller.
//
// We catch HttpException too so any plain Nest @HttpException follows the
// same envelope rather than Nest's default {statusCode, message} shape.
@Catch()
export class AppErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('AppErrorFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof AppError) {
      const body: { error: { code: string; message: string; details?: unknown } } = {
        error: { code: exception.code, message: exception.message },
      };
      const det = (exception as AppError & { details?: unknown }).details;
      if (det !== undefined) body.error.details = det;
      res.status(exception.statusCode).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string }).message ?? exception.message);
      res.status(status).json({
        error: { code: codeForStatus(status), message },
      });
      return;
    }

    this.logger.error(`Unhandled error: ${(exception as Error)?.message ?? exception}`);
    res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
    });
  }
}

function codeForStatus(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 429: return 'TOO_MANY_REQUESTS';
    default: return 'ERROR';
  }
}
