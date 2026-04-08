import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors.js';
import type { UserPublic } from '@pileo/shared';

export interface AuthenticatedRequest extends Request {
  user: UserPublic;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const session = req.session as unknown as Record<string, unknown>;

  if (!session['userId'] || !session['user']) {
    throw new UnauthorizedError();
  }

  (req as AuthenticatedRequest).user = session['user'] as UserPublic;
  next();
}
