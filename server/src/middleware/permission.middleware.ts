import type { Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../config/database.js';
import { projectMembers } from '../db/schema/index.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import type { AuthenticatedRequest } from './auth.middleware.js';
import type { ProjectMemberRole } from '@pileo/shared';

export function requireProjectRole(...allowedRoles: ProjectMemberRole[]) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    const { projectId } = req.params;

    if (!projectId) {
      throw new NotFoundError('Project');
    }

    const membership = await db
      .select({ role: projectMembers.role })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, req.user.id),
        ),
      )
      .limit(1);

    const member = membership[0];

    if (!member) {
      throw new ForbiddenError('You are not a member of this project');
    }

    if (!allowedRoles.includes(member.role as ProjectMemberRole)) {
      throw new ForbiddenError();
    }

    next();
  };
}
