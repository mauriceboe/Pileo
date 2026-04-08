import { eq, asc } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  checklistItems,
  tasks,
  columns,
  boards,
} from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { getMemberRole, requireRole } from './project.service.js';
import { broadcastToBoard } from '../websocket/broadcast.js';
import { WEBSOCKET_EVENTS } from '@pileo/shared';

type ChecklistItemRow = typeof checklistItems.$inferSelect;

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

async function resolveItemContext(itemId: string): Promise<{ item: ChecklistItemRow; context: TaskContext }> {
  const itemRows = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.id, itemId))
    .limit(1);

  const item = itemRows[0];
  if (!item) {
    throw new NotFoundError('Checklist item', itemId);
  }

  const context = await resolveTaskContext(item.taskId);
  return { item, context };
}

export async function create(
  taskId: string,
  userId: string,
  title: string,
): Promise<ChecklistItemRow> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  // Auto-position at end
  const existing = await db
    .select({ position: checklistItems.position })
    .from(checklistItems)
    .where(eq(checklistItems.taskId, taskId))
    .orderBy(asc(checklistItems.position));

  const nextPosition = existing.length > 0
    ? existing[existing.length - 1]!.position + 1
    : 0;

  const inserted = await db
    .insert(checklistItems)
    .values({
      taskId,
      title,
      position: nextPosition,
    })
    .returning();

  const item = inserted[0]!;

  broadcastToBoard(context.boardId, WEBSOCKET_EVENTS.CHECKLIST_UPDATED, {
    taskId,
    action: 'created',
    item,
  }, userId);

  logger.info({ itemId: item.id, taskId, userId }, 'Checklist item created');
  return item;
}

export async function update(
  itemId: string,
  userId: string,
  data: { title?: string; isCompleted?: boolean },
): Promise<ChecklistItemRow> {
  const { item, context } = await resolveItemContext(itemId);
  const role = await getMemberRole(context.projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  const setData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.title !== undefined) {
    setData.title = data.title;
  }
  if (data.isCompleted !== undefined) {
    setData.isCompleted = data.isCompleted;
  }

  const updated = await db
    .update(checklistItems)
    .set(setData)
    .where(eq(checklistItems.id, itemId))
    .returning();

  const updatedItem = updated[0]!;

  broadcastToBoard(context.boardId, WEBSOCKET_EVENTS.CHECKLIST_UPDATED, {
    taskId: item.taskId,
    action: 'updated',
    item: updatedItem,
  }, userId);

  logger.info({ itemId, userId }, 'Checklist item updated');
  return updatedItem;
}

export async function remove(
  itemId: string,
  userId: string,
): Promise<void> {
  const { item, context } = await resolveItemContext(itemId);
  const role = await getMemberRole(context.projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  await db.delete(checklistItems).where(eq(checklistItems.id, itemId));

  broadcastToBoard(context.boardId, WEBSOCKET_EVENTS.CHECKLIST_UPDATED, {
    taskId: item.taskId,
    action: 'deleted',
    itemId,
  }, userId);

  logger.info({ itemId, userId }, 'Checklist item deleted');
}

export async function reorder(
  taskId: string,
  userId: string,
  itemIds: string[],
): Promise<ChecklistItemRow[]> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  // Verify all itemIds belong to this task
  const existing = await db
    .select({ id: checklistItems.id })
    .from(checklistItems)
    .where(eq(checklistItems.taskId, taskId));

  const existingIds = new Set(existing.map((row) => row.id));

  for (const itemId of itemIds) {
    if (!existingIds.has(itemId)) {
      throw new ValidationError(`Checklist item '${itemId}' does not belong to this task`);
    }
  }

  // Update positions sequentially (better-sqlite3 is synchronous)
  for (let i = 0; i < itemIds.length; i++) {
    await db
      .update(checklistItems)
      .set({ position: i, updatedAt: new Date().toISOString() })
      .where(eq(checklistItems.id, itemIds[i]!));
  }

  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.taskId, taskId))
    .orderBy(asc(checklistItems.position));

  broadcastToBoard(context.boardId, WEBSOCKET_EVENTS.CHECKLIST_UPDATED, {
    taskId,
    action: 'reordered',
    items,
  }, userId);

  logger.info({ taskId, userId }, 'Checklist items reordered');
  return items;
}

export async function list(
  taskId: string,
  userId: string,
): Promise<ChecklistItemRow[]> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  if (!role) {
    throw new NotFoundError('Task', taskId);
  }

  return db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.taskId, taskId))
    .orderBy(asc(checklistItems.position));
}
