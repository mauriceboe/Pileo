import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { adminCreateUserSchema, adminUpdateRoleSchema } from '@pileo/shared';
import type { AdminCreateUserInput, AdminUpdateRoleInput } from '@pileo/shared';
import * as adminService from '../services/admin.service.js';
import * as settingsService from '../services/settings.service.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/users', async (_req: Request, res: Response): Promise<void> => {
  const users = await adminService.listUsers();
  res.status(200).json({ data: users });
});

router.post('/users', validate(adminCreateUserSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: AdminCreateUserInput }).validatedBody;
  const user = await adminService.createUser(body);
  res.status(201).json({ data: user });
});

router.delete('/users/:userId', async (req: Request, res: Response): Promise<void> => {
  await adminService.deleteUser(req.params.userId!, (req as AuthenticatedRequest).user.id);
  res.status(204).send();
});

router.patch('/users/:userId/role', validate(adminUpdateRoleSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: AdminUpdateRoleInput }).validatedBody;
  const user = await adminService.updateRole(
    req.params.userId!,
    (req as AuthenticatedRequest).user.id,
    body,
  );
  res.status(200).json({ data: user });
});

// GET /admin/settings
router.get('/settings', (_req: Request, res: Response): void => {
  res.status(200).json({
    data: {
      registrationEnabled: settingsService.isRegistrationEnabled(),
    },
  });
});

// PATCH /admin/settings
router.patch('/settings', (req: Request, res: Response): void => {
  const { registrationEnabled } = req.body;
  if (typeof registrationEnabled === 'boolean') {
    settingsService.setSetting('registration_enabled', String(registrationEnabled));
  }
  res.status(200).json({
    data: {
      registrationEnabled: settingsService.isRegistrationEnabled(),
    },
  });
});

export { router as adminRoutes };
