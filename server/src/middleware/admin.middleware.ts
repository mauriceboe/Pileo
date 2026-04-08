import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.middleware.js';
import { db } from '../config/database.js';
import { users } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { ForbiddenError } from '../utils/errors.js';

export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    const rows = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const dbRole = rows[0]?.role;
    if (dbRole !== 'admin') {
      return next(new ForbiddenError('Admin access required'));
    }

    next();
  } catch (error) {
    next(error);
  }
}
