import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createColumnSchema, updateColumnSchema } from '@pileo/shared';
import type { CreateColumnInput, UpdateColumnInput } from '@pileo/shared';
import * as columnService from '../services/column.service.js';

const boardColumnRouter = Router({ mergeParams: true });
const columnRouter = Router();

boardColumnRouter.use(authenticate);
columnRouter.use(authenticate);

// POST /boards/:boardId/columns
boardColumnRouter.post('/', validate(createColumnSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: CreateColumnInput }).validatedBody;
  const column = await columnService.create(req.params.boardId!, (req as AuthenticatedRequest).user.id, body);
  res.status(201).json({ data: column });
});

// PATCH /columns/:columnId
columnRouter.patch('/:columnId', validate(updateColumnSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: UpdateColumnInput }).validatedBody;
  const column = await columnService.update(req.params.columnId!, (req as AuthenticatedRequest).user.id, body);
  res.status(200).json({ data: column });
});

// DELETE /columns/:columnId
columnRouter.delete('/:columnId', async (req: Request, res: Response): Promise<void> => {
  await columnService.remove(req.params.columnId!, (req as AuthenticatedRequest).user.id);
  res.status(204).send();
});

export { boardColumnRouter, columnRouter };
