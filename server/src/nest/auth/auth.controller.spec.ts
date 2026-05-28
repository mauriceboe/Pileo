import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/auth.service.js', () => ({
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  getCurrentUser: vi.fn(),
}));
vi.mock('../../services/settings.service.js', () => ({
  isRegistrationEnabled: vi.fn(),
}));

import * as authService from '../../services/auth.service.js';
import * as settingsService from '../../services/settings.service.js';
import { AuthController } from './auth.controller.js';
import { AppError } from '../../utils/errors.js';

const USER = { id: 'u1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('AuthController', () => {
  const ctrl = new AuthController();

  it('registrationStatus mirrors the settings flag', () => {
    vi.mocked(settingsService.isRegistrationEnabled).mockReturnValue(true);
    expect(ctrl.registrationStatus()).toEqual({ data: { enabled: true } });
  });

  it('register rejects with 403 / REGISTRATION_DISABLED when settings flag is off', async () => {
    vi.mocked(settingsService.isRegistrationEnabled).mockReturnValue(false);
    const req = {} as never;
    try {
      await ctrl.register({ email: 'x@x.de', password: 'pw', displayName: 'X', username: 'x' } as never, req);
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(403);
      expect((err as AppError).code).toBe('REGISTRATION_DISABLED');
      expect((err as AppError).message).toBe('Registration is currently disabled');
    }
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('register forwards (body, req) when registration is enabled', async () => {
    vi.mocked(settingsService.isRegistrationEnabled).mockReturnValue(true);
    vi.mocked(authService.register).mockResolvedValue({ id: 'u1' } as never);
    const req = { sessionId: 'abc' } as never;
    await ctrl.register({ email: 'x@x.de', password: 'pw', displayName: 'X', username: 'x' } as never, req);
    expect(authService.register).toHaveBeenCalledWith(
      { email: 'x@x.de', password: 'pw', displayName: 'X', username: 'x' },
      req,
    );
  });

  it('login forwards (body, req) — service writes session on req', async () => {
    vi.mocked(authService.login).mockResolvedValue({ id: 'u1' } as never);
    const req = {} as never;
    await ctrl.login({ email: 'x@x.de', password: 'pw' } as never, req);
    expect(authService.login).toHaveBeenCalledWith({ email: 'x@x.de', password: 'pw' }, req);
  });

  it('logout calls service, clears pileo.sid cookie, returns legacy success envelope', async () => {
    vi.mocked(authService.logout).mockResolvedValue(undefined as never);
    const req = {} as never;
    const clearCookie = vi.fn();
    const status = vi.fn();
    const json = vi.fn();
    status.mockReturnValue({ json });
    const res = { clearCookie, status, json } as never;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ctrl.logout(req, res as any);
    expect(authService.logout).toHaveBeenCalledWith(req);
    expect(clearCookie).toHaveBeenCalledWith('pileo.sid');
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ data: { message: 'Logged out successfully' } });
  });

  it('forgotPassword returns the generic info message (anti-enumeration)', async () => {
    vi.mocked(authService.forgotPassword).mockResolvedValue(undefined as never);
    expect(await ctrl.forgotPassword({ email: 'x@x.de' } as never)).toEqual({
      data: { message: 'If an account with that email exists, a reset link has been sent' },
    });
    expect(authService.forgotPassword).toHaveBeenCalledWith('x@x.de');
  });

  it('resetPassword forwards (token, password)', async () => {
    vi.mocked(authService.resetPassword).mockResolvedValue(undefined as never);
    expect(await ctrl.resetPassword({ token: 't', password: 'pw' } as never)).toEqual({
      data: { message: 'Password has been reset successfully' },
    });
    expect(authService.resetPassword).toHaveBeenCalledWith('t', 'pw');
  });

  it('me wraps the current user', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'u1', username: 'x' } as never);
    expect(await ctrl.me(USER)).toEqual({ data: { id: 'u1', username: 'x' } });
    expect(authService.getCurrentUser).toHaveBeenCalledWith('u1');
  });
});
