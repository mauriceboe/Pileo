import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { shareTokenRateLimit } from '../middleware/rate-limit.middleware.js';
import * as shareService from '../services/share.service.js';

const shareRouter = Router();

// POST /boards/:boardId/share-link — create share link (auth required)
shareRouter.post(
  '/boards/:boardId/share-link',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const result = await shareService.createShareLink(
      req.params.boardId!,
      (req as AuthenticatedRequest).user.id,
    );
    res.status(result.created ? 201 : 200).json({ data: { token: result.token } });
  },
);

// GET /boards/:boardId/share-link — get share link status (auth required)
shareRouter.get(
  '/boards/:boardId/share-link',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const info = await shareService.getShareLink(
      req.params.boardId!,
      (req as AuthenticatedRequest).user.id,
    );
    res.status(200).json({ data: info });
  },
);

// DELETE /boards/:boardId/share-link — delete share link (auth required)
shareRouter.delete(
  '/boards/:boardId/share-link',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    await shareService.deleteShareLink(
      req.params.boardId!,
      (req as AuthenticatedRequest).user.id,
    );
    res.status(204).send();
  },
);

// GET /shared/:token — public board data (NO auth, rate-limited)
shareRouter.get(
  '/shared/:token',
  shareTokenRateLimit,
  async (req: Request, res: Response): Promise<void> => {
    const data = await shareService.getSharedBoardData(req.params.token!);
    if (!data) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invalid or expired link' } });
      return;
    }
    res.status(200).json({ data });
  },
);

export { shareRouter };
