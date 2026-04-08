import { eq, desc } from 'drizzle-orm';
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

export async function log(
  projectId: string,
  taskId: string | null,
  userId: string,
  action: string,
  details?: Record<string, unknown>,
): Promise<void> {
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
