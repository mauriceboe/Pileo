import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createChecklistItemSchema,
  updateChecklistItemSchema,
  reorderChecklistSchema,
} from '@pileo/shared';
import type {
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
  ReorderChecklistInput,
} from '@pileo/shared';
import * as checklistService from '../services/checklist.service.js';

// POST /tasks/:taskId/checklist, PATCH /tasks/:taskId/checklist/reorder
const taskChecklistRouter = Router({ mergeParams: true });
taskChecklistRouter.use(authenticate);

taskChecklistRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const data = await checklistService.list(
    req.params.taskId!,
    (req as AuthenticatedRequest).user.id,
  );
  res.status(200).json({ data });
});

taskChecklistRouter.post('/', validate(createChecklistItemSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: CreateChecklistItemInput }).validatedBody;
  const item = await checklistService.create(
    req.params.taskId!,
    (req as AuthenticatedRequest).user.id,
    body.title,
  );
  res.status(201).json({ data: item });
});

taskChecklistRouter.patch('/reorder', validate(reorderChecklistSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: ReorderChecklistInput }).validatedBody;
  const items = await checklistService.reorder(
    req.params.taskId!,
    (req as AuthenticatedRequest).user.id,
    body.itemIds,
  );
  res.status(200).json({ data: items });
});

// PATCH /checklist/:itemId, DELETE /checklist/:itemId
const checklistRouter = Router();
checklistRouter.use(authenticate);

checklistRouter.patch('/:itemId', validate(updateChecklistItemSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: UpdateChecklistItemInput }).validatedBody;
  const item = await checklistService.update(
    req.params.itemId!,
    (req as AuthenticatedRequest).user.id,
    body,
  );
  res.status(200).json({ data: item });
});

checklistRouter.delete('/:itemId', async (req: Request, res: Response): Promise<void> => {
  await checklistService.remove(
    req.params.itemId!,
    (req as AuthenticatedRequest).user.id,
  );
  res.status(204).send();
});

export { taskChecklistRouter, checklistRouter };
