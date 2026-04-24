import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors.js';
import type { UserPublic } from '@pileo/shared';
import * as apiKeyService from '../services/api-key.service.js';
import * as userService from '../services/user.service.js';

export interface AuthenticatedRequest extends Request {
  user: UserPublic;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  // Try Bearer token first (API key auth for external integrations)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawKey = authHeader.slice(7);
    apiKeyService.resolve(rawKey)
      .then(async (result) => {
        if (result) {
          const user = await userService.getById(result.userId);
          (req as AuthenticatedRequest).user = user;
          next();
          return;
        }
        next(new UnauthorizedError());
      })
      .catch(next);
    return;
  }

  // Fall back to session auth (synchronous)
  const session = req.session as unknown as Record<string, unknown>;

  if (!session['userId'] || !session['user']) {
    throw new UnauthorizedError();
  }

  (req as AuthenticatedRequest).user = session['user'] as UserPublic;
  next();
}
