import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as customFieldService from '../services/custom-field.service.js';

// Project-scoped: /projects/:projectId/custom-fields
const projectCustomFieldRouter = Router({ mergeParams: true });
projectCustomFieldRouter.use(authenticate);

// GET /projects/:projectId/custom-fields
projectCustomFieldRouter.get('/', (req: Request, res: Response): void => {
  const fields = customFieldService.listFields(req.params.projectId!);
  res.status(200).json({ data: fields });
});

// POST /projects/:projectId/custom-fields
projectCustomFieldRouter.post('/', (req: Request, res: Response): void => {
  const { name, type, options, showOnCard } = req.body;
  if (!name || !type) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name and type are required' } });
    return;
  }
  const field = customFieldService.createField(req.params.projectId!, { name, type, options, showOnCard });
  res.status(201).json({ data: field });
});

// PATCH /projects/:projectId/custom-fields/reorder
projectCustomFieldRouter.patch('/reorder', (req: Request, res: Response): void => {
  const { fieldIds } = req.body;
  if (!Array.isArray(fieldIds)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'fieldIds array required' } });
    return;
  }
  customFieldService.reorderFields(req.params.projectId!, fieldIds);
  res.status(200).json({ data: { message: 'Reordered' } });
});

// Standalone: /custom-fields/:fieldId
const customFieldRouter = Router();
customFieldRouter.use(authenticate);

// PATCH /custom-fields/:fieldId
customFieldRouter.patch('/:fieldId', (req: Request, res: Response): void => {
  try {
    const field = customFieldService.updateField(req.params.fieldId!, req.body);
    res.status(200).json({ data: field });
  } catch {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Field not found' } });
  }
});

// DELETE /custom-fields/:fieldId
customFieldRouter.delete('/:fieldId', (_req: Request, res: Response): void => {
  customFieldService.deleteField(_req.params.fieldId!);
  res.status(204).send();
});

// Task custom values: /tasks/:taskId/custom-values
const taskCustomValueRouter = Router({ mergeParams: true });
taskCustomValueRouter.use(authenticate);

// GET /tasks/:taskId/custom-values
taskCustomValueRouter.get('/', (req: Request, res: Response): void => {
  const values = customFieldService.getTaskValues(req.params.taskId!);
  res.status(200).json({ data: values });
});

// PUT /tasks/:taskId/custom-values/:fieldId
taskCustomValueRouter.put('/:fieldId', (req: Request, res: Response): void => {
  const { value } = req.body;
  if (typeof value !== 'string') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'value is required' } });
    return;
  }
  const result = customFieldService.setTaskValue(req.params.taskId!, req.params.fieldId!, value);
  res.status(200).json({ data: result });
});

// DELETE /tasks/:taskId/custom-values/:fieldId
taskCustomValueRouter.delete('/:fieldId', (req: Request, res: Response): void => {
  customFieldService.deleteTaskValue(req.params.taskId!, req.params.fieldId!);
  res.status(204).send();
});

export { projectCustomFieldRouter, customFieldRouter, taskCustomValueRouter };
