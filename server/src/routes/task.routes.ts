import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  bulkTaskOperationSchema,
  updateTaskAssigneesSchema,
  updateTaskLabelsSchema,
} from '@pileo/shared';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
  BulkTaskOperationInput,
  UpdateTaskAssigneesInput,
  UpdateTaskLabelsInput,
} from '@pileo/shared';
import * as taskService from '../services/task.service.js';

// Tasks nested under boards: GET /boards/:boardId/tasks
const boardTaskRouter = Router({ mergeParams: true });
boardTaskRouter.use(authenticate);

boardTaskRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const tasksByColumn = await taskService.list(req.params.boardId!, (req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: tasksByColumn });
});

// Tasks nested under columns: POST /columns/:columnId/tasks
const columnTaskRouter = Router({ mergeParams: true });
columnTaskRouter.use(authenticate);

columnTaskRouter.post('/', validate(createTaskSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: CreateTaskInput }).validatedBody;
  const task = await taskService.create(req.params.columnId!, (req as AuthenticatedRequest).user.id, body);
  res.status(201).json({ data: task });
});

// Standalone task routes: /tasks/:taskId
const taskRouter = Router();
taskRouter.use(authenticate);

// GET /tasks/:taskId/context — resolve board + project for a task
taskRouter.get('/:taskId/context', async (req: Request, res: Response): Promise<void> => {
  const context = await taskService.getContext(req.params.taskId!, (req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: context });
});

// GET /tasks/:taskId
taskRouter.get('/:taskId', async (req: Request, res: Response): Promise<void> => {
  const task = await taskService.getById(req.params.taskId!, (req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: task });
});

// PATCH /tasks/:taskId
taskRouter.patch('/:taskId', validate(updateTaskSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: UpdateTaskInput }).validatedBody;
  const task = await taskService.update(req.params.taskId!, (req as AuthenticatedRequest).user.id, body);
  res.status(200).json({ data: task });
});

// DELETE /tasks/:taskId
taskRouter.delete('/:taskId', async (req: Request, res: Response): Promise<void> => {
  await taskService.remove(req.params.taskId!, (req as AuthenticatedRequest).user.id);
  res.status(204).send();
});

// PATCH /tasks/:taskId/move
taskRouter.patch('/:taskId/move', validate(moveTaskSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: MoveTaskInput }).validatedBody;
  const task = await taskService.move(req.params.taskId!, (req as AuthenticatedRequest).user.id, body);
  res.status(200).json({ data: task });
});

// PATCH /tasks/:taskId/assignees
taskRouter.patch('/:taskId/assignees', validate(updateTaskAssigneesSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: UpdateTaskAssigneesInput }).validatedBody;
  const updated = await taskService.updateAssignees(req.params.taskId!, (req as AuthenticatedRequest).user.id, body);
  res.status(200).json({ data: updated });
});

// PATCH /tasks/:taskId/labels
taskRouter.patch('/:taskId/labels', validate(updateTaskLabelsSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: UpdateTaskLabelsInput }).validatedBody;
  const updated = await taskService.updateLabels(req.params.taskId!, (req as AuthenticatedRequest).user.id, body);
  res.status(200).json({ data: updated });
});

// POST /tasks/bulk-move
taskRouter.post('/bulk-move', validate(bulkTaskOperationSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: BulkTaskOperationInput }).validatedBody;
  const result = await taskService.bulkMove(body.taskIds, body.targetColumnId, (req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: result });
});

// POST /tasks/bulk-duplicate
taskRouter.post('/bulk-duplicate', validate(bulkTaskOperationSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: BulkTaskOperationInput }).validatedBody;
  const result = await taskService.bulkDuplicate(body.taskIds, body.targetColumnId, (req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: result });
});

export { boardTaskRouter, columnTaskRouter, taskRouter };
