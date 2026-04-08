import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createCommentSchema, updateCommentSchema } from '@pileo/shared';
import type { CreateCommentInput, UpdateCommentInput } from '@pileo/shared';
import * as commentService from '../services/comment.service.js';

// GET /tasks/:taskId/comments, POST /tasks/:taskId/comments
const taskCommentRouter = Router({ mergeParams: true });
taskCommentRouter.use(authenticate);

taskCommentRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const data = await commentService.list(
    req.params.taskId!,
    (req as AuthenticatedRequest).user.id,
  );
  res.status(200).json({ data });
});

taskCommentRouter.post('/', validate(createCommentSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: CreateCommentInput }).validatedBody;
  const comment = await commentService.create(
    req.params.taskId!,
    (req as AuthenticatedRequest).user.id,
    body.content,
  );
  res.status(201).json({ data: comment });
});

// PATCH /comments/:commentId, DELETE /comments/:commentId
const commentRouter = Router();
commentRouter.use(authenticate);

commentRouter.patch('/:commentId', validate(updateCommentSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: UpdateCommentInput }).validatedBody;
  const comment = await commentService.update(
    req.params.commentId!,
    (req as AuthenticatedRequest).user.id,
    body.content,
  );
  res.status(200).json({ data: comment });
});

commentRouter.delete('/:commentId', async (req: Request, res: Response): Promise<void> => {
  await commentService.remove(
    req.params.commentId!,
    (req as AuthenticatedRequest).user.id,
  );
  res.status(204).send();
});

export { taskCommentRouter, commentRouter };
