import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createLabelSchema, updateLabelSchema } from '@pileo/shared';
import type { CreateLabelInput, UpdateLabelInput } from '@pileo/shared';
import * as labelService from '../services/label.service.js';

const projectLabelRouter = Router({ mergeParams: true });
const labelRouter = Router();

projectLabelRouter.use(authenticate);
labelRouter.use(authenticate);

// GET /projects/:projectId/labels
projectLabelRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const labelList = await labelService.list(req.params.projectId!, (req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: labelList });
});

// POST /projects/:projectId/labels
projectLabelRouter.post('/', validate(createLabelSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: CreateLabelInput }).validatedBody;
  const label = await labelService.create(req.params.projectId!, (req as AuthenticatedRequest).user.id, body);
  res.status(201).json({ data: label });
});

// PATCH /labels/:labelId
labelRouter.patch('/:labelId', validate(updateLabelSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: UpdateLabelInput }).validatedBody;
  const label = await labelService.update(req.params.labelId!, (req as AuthenticatedRequest).user.id, body);
  res.status(200).json({ data: label });
});

// DELETE /labels/:labelId
labelRouter.delete('/:labelId', async (req: Request, res: Response): Promise<void> => {
  await labelService.remove(req.params.labelId!, (req as AuthenticatedRequest).user.id);
  res.status(204).send();
});

export { projectLabelRouter, labelRouter };
