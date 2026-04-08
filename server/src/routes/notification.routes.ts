import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as notificationService from '../services/notification.service.js';

const notificationRouter = Router();
notificationRouter.use(authenticate);

// GET /notifications
notificationRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).user.id;
  const data = await notificationService.list(userId);
  const unreadCount = await notificationService.getUnreadCount(userId);
  res.status(200).json({ data, unreadCount });
});

// PATCH /notifications/:id/read
notificationRouter.patch('/:id/read', async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).user.id;
  const notification = await notificationService.markRead(req.params.id!, userId);
  res.status(200).json({ data: notification });
});

// POST /notifications/read-all
notificationRouter.post('/read-all', async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).user.id;
  await notificationService.markAllRead(userId);
  res.status(204).send();
});

export { notificationRouter };
