import { eq, desc, and, gte } from 'drizzle-orm';
import { db } from '../config/database.js';
import { activityLog, tasks, columns, boards, users } from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import { NotFoundError } from '../utils/errors.js';
import { getMemberRole } from './project.service.js';

type ActivityLogRow = typeof activityLog.$inferSelect;

interface ActivityEntryWithUser extends ActivityLogRow {
  userDisplayName: string;
  userAvatarPath: string | null;
}

const COALESCE_WINDOW_MS = 15 * 60 * 1000;

// Merge two change records: preserve earlier oldValue and take latest newValue per field.
function mergeChanges(
  earlier: Record<string, unknown>,
  later: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...earlier };
  for (const [key, value] of Object.entries(later)) {
    const existing = merged[key];
    if (
      existing
      && typeof existing === 'object'
      && value
      && typeof value === 'object'
      && 'oldValue' in (existing as Record<string, unknown>)
      && 'newValue' in (value as Record<string, unknown>)
    ) {
      merged[key] = {
        oldValue: (existing as Record<string, unknown>).oldValue,
        newValue: (value as Record<string, unknown>).newValue,
      };
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

export async function log(
  projectId: string,
  taskId: string | null,
  userId: string,
  action: string,
  details?: Record<string, unknown>,
): Promise<void> {
  // Coalesce rapid-fire task.updated entries by the same user for the same task
  // within a 15-minute window — merges details instead of spamming.
  if (action === 'task.updated' && taskId && details) {
    const windowStart = new Date(Date.now() - COALESCE_WINDOW_MS).toISOString();
    const existingRows = await db
      .select({ id: activityLog.id, details: activityLog.details })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.taskId, taskId),
          eq(activityLog.userId, userId),
          eq(activityLog.action, action),
          gte(activityLog.createdAt, windowStart),
        ),
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(1);

    const existing = existingRows[0];
    if (existing) {
      let existingDetails: Record<string, unknown> = {};
      try {
        existingDetails = existing.details ? JSON.parse(existing.details) as Record<string, unknown> : {};
      } catch {
        existingDetails = {};
      }
      const merged = mergeChanges(existingDetails, details);
      await db
        .update(activityLog)
        .set({
          details: JSON.stringify(merged),
          createdAt: new Date().toISOString(),
        })
        .where(eq(activityLog.id, existing.id));
      logger.info({ projectId, taskId, userId, action, coalesced: true }, 'Activity coalesced');
      return;
    }
  }

  await db.insert(activityLog).values({
    projectId,
    taskId,
    userId,
    action,
    details: details ? JSON.stringify(details) : null,
  });

  logger.info({ projectId, taskId, userId, action }, 'Activity logged');
}

export async function getForTask(
  taskId: string,
  userId: string,
): Promise<ActivityEntryWithUser[]> {
  // Resolve project membership through task -> column -> board -> project
  const taskRows = await db
    .select({ projectId: boards.projectId })
    .from(tasks)
    .innerJoin(columns, eq(tasks.columnId, columns.id))
    .innerJoin(boards, eq(columns.boardId, boards.id))
    .where(eq(tasks.id, taskId))
    .limit(1);

  const row = taskRows[0];
  if (!row) {
    throw new NotFoundError('Task', taskId);
  }

  const role = await getMemberRole(row.projectId, userId);
  if (!role) {
    throw new NotFoundError('Task', taskId);
  }

  const rows = await db
    .select({
      id: activityLog.id,
      projectId: activityLog.projectId,
      taskId: activityLog.taskId,
      userId: activityLog.userId,
      action: activityLog.action,
      details: activityLog.details,
      createdAt: activityLog.createdAt,
      userDisplayName: users.displayName,
      userAvatarPath: users.avatarPath,
    })
    .from(activityLog)
    .innerJoin(users, eq(activityLog.userId, users.id))
    .where(eq(activityLog.taskId, taskId))
    .orderBy(desc(activityLog.createdAt));

  return rows;
}

export async function getForProject(
  projectId: string,
  userId: string,
): Promise<ActivityEntryWithUser[]> {
  const role = await getMemberRole(projectId, userId);
  if (!role) {
    throw new NotFoundError('Project', projectId);
  }

  return db
    .select({
      id: activityLog.id,
      projectId: activityLog.projectId,
      taskId: activityLog.taskId,
      userId: activityLog.userId,
      action: activityLog.action,
      details: activityLog.details,
      createdAt: activityLog.createdAt,
      userDisplayName: users.displayName,
      userAvatarPath: users.avatarPath,
    })
    .from(activityLog)
    .innerJoin(users, eq(activityLog.userId, users.id))
    .where(eq(activityLog.projectId, projectId))
    .orderBy(desc(activityLog.createdAt))
    .limit(100);
}
