import { Router } from 'express';
import type { Request, Response } from 'express';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@pileo/shared';
import * as authService from '../services/auth.service.js';
import { isRegistrationEnabled } from '../services/settings.service.js';
const router = Router();

router.get('/registration-status', (_req: Request, res: Response): void => {
  res.status(200).json({ data: { enabled: isRegistrationEnabled() } });
});

router.post('/register', validate(registerSchema), async (req: Request, res: Response): Promise<void> => {
  if (!isRegistrationEnabled()) {
    res.status(403).json({ error: { code: 'REGISTRATION_DISABLED', message: 'Registration is currently disabled' } });
    return;
  }
  const user = await authService.register((req as Request & { validatedBody: unknown }).validatedBody as Parameters<typeof authService.register>[0], req);
  res.status(201).json({ data: user });
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  const user = await authService.login((req as Request & { validatedBody: unknown }).validatedBody as Parameters<typeof authService.login>[0], req);
  res.status(200).json({ data: user });
});

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  await authService.logout(req);
  res.clearCookie('pileo.sid');
  res.status(200).json({ data: { message: 'Logged out successfully' } });
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: { email: string } }).validatedBody;
  await authService.forgotPassword(body.email);
  res.status(200).json({ data: { message: 'If an account with that email exists, a reset link has been sent' } });
});

router.post('/reset-password', validate(resetPasswordSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: { token: string; password: string } }).validatedBody;
  await authService.resetPassword(body.token, body.password);
  res.status(200).json({ data: { message: 'Password has been reset successfully' } });
});

router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  const user = await authService.getCurrentUser((req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: user });
});

export { router as authRoutes };
