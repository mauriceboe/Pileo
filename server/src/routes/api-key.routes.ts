import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as apiKeyService from '../services/api-key.service.js';

const projectApiKeyRouter = Router({ mergeParams: true });
const apiKeyRouter = Router();

projectApiKeyRouter.use(authenticate);
apiKeyRouter.use(authenticate);

// GET /projects/:projectId/api-keys
projectApiKeyRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const keys = await apiKeyService.list(req.params.projectId!, (req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: keys });
});

// POST /projects/:projectId/api-keys
projectApiKeyRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body as { name: string };
  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name is required (max 100 characters)' } });
    return;
  }
  const result = await apiKeyService.create(req.params.projectId!, (req as AuthenticatedRequest).user.id, name.trim());
  res.status(201).json({ data: result });
});

// DELETE /api-keys/:keyId
apiKeyRouter.delete('/:keyId', async (req: Request, res: Response): Promise<void> => {
  await apiKeyService.revoke(req.params.keyId!, (req as AuthenticatedRequest).user.id);
  res.status(204).send();
});

export { projectApiKeyRouter, apiKeyRouter };
