import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { PileoAuthGuard } from './auth.guard.js';
import { UnauthorizedError } from '../../utils/errors.js';

vi.mock('../../services/api-key.service.js', () => ({
  resolve: vi.fn(),
}));
vi.mock('../../services/user.service.js', () => ({
  getById: vi.fn(),
}));

import * as apiKeyService from '../../services/api-key.service.js';
import * as userService from '../../services/user.service.js';

function ctxFor(req: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
      getNext: () => () => undefined,
    }),
  } as unknown as ExecutionContext;
}

describe('PileoAuthGuard', () => {
  const guard = new PileoAuthGuard();
  const user = { id: 'user-1', username: 'maurice' };

  beforeEach(() => {
    vi.mocked(apiKeyService.resolve).mockReset();
    vi.mocked(userService.getById).mockReset();
  });

  it('accepts a valid Bearer API key and attaches user', async () => {
    vi.mocked(apiKeyService.resolve).mockResolvedValue({ userId: 'user-1', projectId: 'p1' } as never);
    vi.mocked(userService.getById).mockResolvedValue(user as never);

    const req: Record<string, unknown> = { headers: { authorization: 'Bearer pil_abc' } };
    await expect(guard.canActivate(ctxFor(req))).resolves.toBe(true);
    expect(req.user).toEqual(user);
    expect(apiKeyService.resolve).toHaveBeenCalledWith('pil_abc');
  });

  it('rejects an invalid Bearer API key', async () => {
    vi.mocked(apiKeyService.resolve).mockResolvedValue(null as never);
    const req = { headers: { authorization: 'Bearer pil_bad' } };
    await expect(guard.canActivate(ctxFor(req))).rejects.toBeInstanceOf(UnauthorizedError);
    expect(userService.getById).not.toHaveBeenCalled();
  });

  it('accepts a valid express-session and attaches user', async () => {
    const req: Record<string, unknown> = {
      headers: {},
      session: { userId: 'user-1', user },
    };
    await expect(guard.canActivate(ctxFor(req))).resolves.toBe(true);
    expect(req.user).toEqual(user);
    expect(apiKeyService.resolve).not.toHaveBeenCalled();
  });

  it('rejects requests with neither Bearer nor session', async () => {
    const req = { headers: {} };
    await expect(guard.canActivate(ctxFor(req))).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a session that has no user attached', async () => {
    const req = { headers: {}, session: { userId: 'user-1' } };
    await expect(guard.canActivate(ctxFor(req))).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('ignores non-Bearer Authorization schemes and falls through to session', async () => {
    // Basic auth header but valid session — should accept via session.
    const req: Record<string, unknown> = {
      headers: { authorization: 'Basic abc==' },
      session: { userId: 'user-1', user },
    };
    await expect(guard.canActivate(ctxFor(req))).resolves.toBe(true);
    expect(apiKeyService.resolve).not.toHaveBeenCalled();
  });
});
