import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as activityService from '../services/activity.service.js';

// GET /tasks/:taskId/activity
const taskActivityRouter = Router({ mergeParams: true });
taskActivityRouter.use(authenticate);

taskActivityRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const activity = await activityService.getForTask(req.params.taskId!, (req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: activity });
});

// GET /projects/:projectId/activity
const projectActivityRouter = Router({ mergeParams: true });
projectActivityRouter.use(authenticate);

projectActivityRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const activity = await activityService.getForProject(req.params.projectId!, (req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: activity });
});

export { taskActivityRouter, projectActivityRouter };
