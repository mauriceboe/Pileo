import { eq, and } from 'drizzle-orm';
import { db } from '../config/database.js';
import { projectMembers, users } from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors.js';
import { getMemberRole, requireRole } from './project.service.js';
import type { ProjectMemberRole } from '@pileo/shared';

interface MemberWithUser {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarPath: string | null;
  };
}

export async function listMembers(projectId: string, userId: string): Promise<MemberWithUser[]> {
  const role = await getMemberRole(projectId, userId);
  if (!role) {
    throw new NotFoundError('Project', projectId);
  }

  const rows = await db
    .select({
      id: projectMembers.id,
      projectId: projectMembers.projectId,
      userId: projectMembers.userId,
      role: projectMembers.role,
      joinedAt: projectMembers.joinedAt,
      user: {
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        avatarPath: users.avatarPath,
      },
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));

  return rows;
}

export async function addMember(
  projectId: string,
  userId: string,
  targetEmail: string,
  role: ProjectMemberRole = 'member',
): Promise<MemberWithUser> {
  const callerRole = await getMemberRole(projectId, userId);
  requireRole(callerRole, ['owner', 'admin']);

  // Prevent adding members with higher or equal privilege than caller (except owner adding anyone)
  if (callerRole === 'admin' && (role === 'owner' || role === 'admin')) {
    throw new ForbiddenError('Admins cannot assign owner or admin roles');
  }

  // Look up target user by email
  const targetUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, targetEmail))
    .limit(1);

  const targetUser = targetUsers[0];
  if (!targetUser) {
    throw new NotFoundError('User');
  }

  // Check if already a member
  const existing = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, targetUser.id),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError('User is already a member of this project');
  }

  await db.insert(projectMembers).values({
    projectId,
    userId: targetUser.id,
    role,
  });

  logger.info({ projectId, userId, targetUserId: targetUser.id, role }, 'Member added to project');

  // Return the newly added member with user details
  const members = await db
    .select({
      id: projectMembers.id,
      projectId: projectMembers.projectId,
      userId: projectMembers.userId,
      role: projectMembers.role,
      joinedAt: projectMembers.joinedAt,
      user: {
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        avatarPath: users.avatarPath,
      },
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, targetUser.id),
      ),
    )
    .limit(1);

  return members[0]!;
}

export async function updateMemberRole(
  projectId: string,
  userId: string,
  targetUserId: string,
  role: ProjectMemberRole,
): Promise<MemberWithUser> {
  const callerRole = await getMemberRole(projectId, userId);
  requireRole(callerRole, ['owner', 'admin']);

  // Admins cannot promote to owner or admin
  if (callerRole === 'admin' && (role === 'owner' || role === 'admin')) {
    throw new ForbiddenError('Admins cannot assign owner or admin roles');
  }

  const targetRole = await getMemberRole(projectId, targetUserId);
  if (!targetRole) {
    throw new NotFoundError('Project member');
  }

  // Admins cannot demote other admins or owners
  if (callerRole === 'admin' && (targetRole === 'owner' || targetRole === 'admin')) {
    throw new ForbiddenError('Admins cannot modify owner or admin roles');
  }

  // Prevent demoting the last owner
  if (targetRole === 'owner' && role !== 'owner') {
    const ownerCount = await db
      .select({ id: projectMembers.id })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.role, 'owner'),
        ),
      );

    if (ownerCount.length <= 1) {
      throw new ForbiddenError('Cannot demote the last owner of the project');
    }
  }

  await db
    .update(projectMembers)
    .set({ role })
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, targetUserId),
      ),
    );

  logger.info({ projectId, userId, targetUserId, role }, 'Member role updated');

  const members = await db
    .select({
      id: projectMembers.id,
      projectId: projectMembers.projectId,
      userId: projectMembers.userId,
      role: projectMembers.role,
      joinedAt: projectMembers.joinedAt,
      user: {
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        avatarPath: users.avatarPath,
      },
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, targetUserId),
      ),
    )
    .limit(1);

  return members[0]!;
}

export async function removeMember(
  projectId: string,
  userId: string,
  targetUserId: string,
): Promise<void> {
  const callerRole = await getMemberRole(projectId, userId);
  requireRole(callerRole, ['owner', 'admin']);

  const targetRole = await getMemberRole(projectId, targetUserId);
  if (!targetRole) {
    throw new NotFoundError('Project member');
  }

  // Admins cannot remove owners or other admins
  if (callerRole === 'admin' && (targetRole === 'owner' || targetRole === 'admin')) {
    throw new ForbiddenError('Admins cannot remove owners or other admins');
  }

  // Prevent removing the last owner
  if (targetRole === 'owner') {
    const ownerCount = await db
      .select({ id: projectMembers.id })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.role, 'owner'),
        ),
      );

    if (ownerCount.length <= 1) {
      throw new ForbiddenError('Cannot remove the last owner of the project');
    }
  }

  await db
    .delete(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, targetUserId),
      ),
    );

  logger.info({ projectId, userId, targetUserId }, 'Member removed from project');
}
