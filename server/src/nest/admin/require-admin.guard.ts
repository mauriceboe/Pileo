import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { users } from '../../db/schema/index.js';
import { ForbiddenError } from '../../utils/errors.js';

// Mirrors server/src/middleware/admin.middleware.ts. Must be applied AFTER
// PileoAuthGuard so req.user is set; throws ForbiddenError otherwise.
@Injectable()
export class RequireAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: { id: string } }>();
    if (!req.user) throw new ForbiddenError('Admin access required');
    const rows = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);
    if (rows[0]?.role !== 'admin') throw new ForbiddenError('Admin access required');
    return true;
  }
}
