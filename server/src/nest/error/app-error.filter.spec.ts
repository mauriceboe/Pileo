import { describe, it, expect, vi } from 'vitest';
import { HttpException, type ArgumentsHost } from '@nestjs/common';
import { AppErrorFilter } from './app-error.filter.js';
import { NotFoundError, ValidationError, UnauthorizedError } from '../../utils/errors.js';

function hostFor() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({}), getNext: () => () => undefined }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('AppErrorFilter', () => {
  const filter = new AppErrorFilter();

  it('serialises NotFoundError with status 404 and code NOT_FOUND', () => {
    const { host, res } = hostFor();
    filter.catch(new NotFoundError('Label', 'l1'), host);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: "Label with id 'l1' not found" },
    });
  });

  it('serialises UnauthorizedError as 401 / UNAUTHORIZED', () => {
    const { host, res } = hostFor();
    filter.catch(new UnauthorizedError(), host);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  });

  it('forwards ValidationError details verbatim (matches legacy envelope)', () => {
    const { host, res } = hostFor();
    const ve = new ValidationError('Validation failed', [{ path: 'name', message: 'required' }]);
    filter.catch(ve, host);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [{ path: 'name', message: 'required' }],
      },
    });
  });

  it('coerces Nest HttpException into the Pileo envelope', () => {
    const { host, res } = hostFor();
    filter.catch(new HttpException('Forbidden zone', 403), host);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'FORBIDDEN', message: 'Forbidden zone' },
    });
  });

  it('falls back to 500 INTERNAL_SERVER_ERROR for unknown throwables', () => {
    const { host, res } = hostFor();
    filter.catch(new Error('boom'), host);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
    });
  });
});
