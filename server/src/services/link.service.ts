import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  taskLinks,
  tasks,
  columns,
  boards,
} from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { getMemberRole, requireRole } from './project.service.js';
import { broadcastToBoard } from '../websocket/broadcast.js';
import { WEBSOCKET_EVENTS } from '@pileo/shared';

type TaskLinkRow = typeof taskLinks.$inferSelect;

interface TaskContext {
  taskId: string;
  columnId: string;
  boardId: string;
  projectId: string;
}

async function resolveTaskContext(taskId: string): Promise<TaskContext> {
  const rows = await db
    .select({
      taskId: tasks.id,
      columnId: tasks.columnId,
      boardId: columns.boardId,
      projectId: boards.projectId,
    })
    .from(tasks)
    .innerJoin(columns, eq(tasks.columnId, columns.id))
    .innerJoin(boards, eq(columns.boardId, boards.id))
    .where(eq(tasks.id, taskId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('Task', taskId);
  }

  return row;
}

export async function list(
  taskId: string,
  userId: string,
): Promise<TaskLinkRow[]> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  if (!role) {
    throw new NotFoundError('Task', taskId);
  }

  return db
    .select()
    .from(taskLinks)
    .where(eq(taskLinks.taskId, taskId));
}

export async function create(
  taskId: string,
  userId: string,
  url: string,
): Promise<TaskLinkRow> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  const inserted = await db
    .insert(taskLinks)
    .values({
      taskId,
      url,
      createdBy: userId,
    })
    .returning();

  const link = inserted[0]!;

  broadcastToBoard(context.boardId, WEBSOCKET_EVENTS.TASK_UPDATED, {
    taskId,
    action: 'link_created',
    link,
  }, userId);

  logger.info({ linkId: link.id, taskId, userId }, 'Task link created');
  return link;
}

export async function remove(
  linkId: string,
  userId: string,
): Promise<void> {
  const linkRows = await db
    .select()
    .from(taskLinks)
    .where(eq(taskLinks.id, linkId))
    .limit(1);

  const link = linkRows[0];
  if (!link) {
    throw new NotFoundError('Link', linkId);
  }

  const context = await resolveTaskContext(link.taskId);
  const role = await getMemberRole(context.projectId, userId);

  const isCreator = link.createdBy === userId;
  const isAdminOrOwner = role === 'owner' || role === 'admin';

  if (!isCreator && !isAdminOrOwner) {
    throw new ForbiddenError();
  }

  await db.delete(taskLinks).where(eq(taskLinks.id, linkId));

  broadcastToBoard(context.boardId, WEBSOCKET_EVENTS.TASK_UPDATED, {
    taskId: link.taskId,
    action: 'link_deleted',
    linkId,
  }, userId);

  logger.info({ linkId, userId }, 'Task link deleted');
}
