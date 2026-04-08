import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as linkService from '../services/link.service.js';

// GET /tasks/:taskId/links, POST /tasks/:taskId/links
const taskLinkRouter = Router({ mergeParams: true });
taskLinkRouter.use(authenticate);

taskLinkRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const data = await linkService.list(
    req.params.taskId!,
    (req as AuthenticatedRequest).user.id,
  );
  res.status(200).json({ data });
});

taskLinkRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body as { url: string };
  const link = await linkService.create(
    req.params.taskId!,
    (req as AuthenticatedRequest).user.id,
    url,
  );
  res.status(201).json({ data: link });
});

// DELETE /links/:linkId
const linkRouter = Router();
linkRouter.use(authenticate);

linkRouter.delete('/:linkId', async (req: Request, res: Response): Promise<void> => {
  await linkService.remove(
    req.params.linkId!,
    (req as AuthenticatedRequest).user.id,
  );
  res.status(204).send();
});

export { taskLinkRouter, linkRouter };
