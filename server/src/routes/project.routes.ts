import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { createProjectSchema, updateProjectSchema } from '@pileo/shared';
import type { CreateProjectInput, UpdateProjectInput } from '@pileo/shared';
import * as projectService from '../services/project.service.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const projects = await projectService.list((req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: projects });
});

router.post('/', validate(createProjectSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: CreateProjectInput }).validatedBody;
  const project = await projectService.create(body, (req as AuthenticatedRequest).user.id);
  res.status(201).json({ data: project });
});

router.get('/:projectId', async (req: Request, res: Response): Promise<void> => {
  const project = await projectService.getById(req.params.projectId!, (req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: project });
});

router.patch('/:projectId', validate(updateProjectSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: UpdateProjectInput }).validatedBody;
  const project = await projectService.update(req.params.projectId!, (req as AuthenticatedRequest).user.id, body);
  res.status(200).json({ data: project });
});

router.delete('/:projectId', async (req: Request, res: Response): Promise<void> => {
  await projectService.remove(req.params.projectId!, (req as AuthenticatedRequest).user.id);
  res.status(204).send();
});

router.patch('/:projectId/archive', async (req: Request, res: Response): Promise<void> => {
  const project = await projectService.archive(req.params.projectId!, (req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: project });
});

router.patch('/:projectId/background', upload.single('background'), async (req: Request, res: Response): Promise<void> => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No file provided' } });
    return;
  }
  const urlPath = `/uploads/${file.filename}`;
  const project = await projectService.updateBackground(req.params.projectId!, (req as AuthenticatedRequest).user.id, urlPath);
  res.status(200).json({ data: project });
});

export { router as projectRoutes };
