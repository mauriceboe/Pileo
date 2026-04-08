import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createBoardSchema, updateBoardSchema, reorderColumnsSchema } from '@pileo/shared';
import type { CreateBoardInput, UpdateBoardInput, ReorderColumnsInput } from '@pileo/shared';
import * as boardService from '../services/board.service.js';

const projectBoardRouter = Router({ mergeParams: true });
const boardRouter = Router();

projectBoardRouter.use(authenticate);
boardRouter.use(authenticate);

// GET /projects/:projectId/boards
projectBoardRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const boardList = await boardService.list(req.params.projectId!, (req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: boardList });
});

// POST /projects/:projectId/boards
projectBoardRouter.post('/', validate(createBoardSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: CreateBoardInput }).validatedBody;
  const board = await boardService.create(req.params.projectId!, (req as AuthenticatedRequest).user.id, body);
  res.status(201).json({ data: board });
});

// GET /boards/:boardId
boardRouter.get('/:boardId', async (req: Request, res: Response): Promise<void> => {
  const board = await boardService.getById(req.params.boardId!, (req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: board });
});

// PATCH /boards/:boardId
boardRouter.patch('/:boardId', validate(updateBoardSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: UpdateBoardInput }).validatedBody;
  const board = await boardService.update(req.params.boardId!, (req as AuthenticatedRequest).user.id, body);
  res.status(200).json({ data: board });
});

// DELETE /boards/:boardId
boardRouter.delete('/:boardId', async (req: Request, res: Response): Promise<void> => {
  await boardService.remove(req.params.boardId!, (req as AuthenticatedRequest).user.id);
  res.status(204).send();
});

// PATCH /boards/:boardId/reorder
boardRouter.patch('/:boardId/reorder', validate(reorderColumnsSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: ReorderColumnsInput }).validatedBody;
  await boardService.reorderColumns(req.params.boardId!, (req as AuthenticatedRequest).user.id, body.columnIds);
  res.status(200).json({ data: { message: 'Columns reordered successfully' } });
});

export { projectBoardRouter, boardRouter };
