import { eq, and, asc } from 'drizzle-orm';
import { db } from '../config/database.js';
import { columns, boards, tasks } from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import {
  NotFoundError,
  ValidationError,
} from '../utils/errors.js';
import { getMemberRole, requireRole } from './project.service.js';
import {
  broadcastColumnCreated,
  broadcastColumnUpdated,
  broadcastColumnDeleted,
  broadcastColumnReordered,
} from '../websocket/handlers/column.handler.js';
import type { CreateColumnInput, UpdateColumnInput } from '@pileo/shared';

type ColumnRow = typeof columns.$inferSelect;

async function getProjectIdForBoard(boardId: string): Promise<string> {
  const rows = await db
    .select({ projectId: boards.projectId })
    .from(boards)
    .where(eq(boards.id, boardId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('Board', boardId);
  }

  return row.projectId;
}

async function getColumnWithBoard(columnId: string): Promise<{ column: ColumnRow; projectId: string }> {
  const rows = await db
    .select({
      column: columns,
      projectId: boards.projectId,
    })
    .from(columns)
    .innerJoin(boards, eq(columns.boardId, boards.id))
    .where(eq(columns.id, columnId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('Column', columnId);
  }

  return row;
}

export async function create(
  boardId: string,
  userId: string,
  data: CreateColumnInput,
): Promise<ColumnRow> {
  const projectId = await getProjectIdForBoard(boardId);
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  // Auto-position at end
  const existingColumns = await db
    .select({ position: columns.position })
    .from(columns)
    .where(eq(columns.boardId, boardId))
    .orderBy(asc(columns.position));

  const nextPosition = existingColumns.length > 0
    ? existingColumns[existingColumns.length - 1]!.position + 1
    : 0;

  const inserted = await db
    .insert(columns)
    .values({
      boardId,
      name: data.name,
      color: data.color ?? '#4A90D9',
      icon: data.icon ?? null,
      position: nextPosition,
      isCompleted: data.isCompleted ?? false,
      taskLimit: data.taskLimit ?? null,
    })
    .returning();

  const column = inserted[0]!;

  // Broadcast to board room
  broadcastColumnCreated(boardId, column, userId);

  logger.info({ columnId: column.id, boardId, userId }, 'Column created');
  return column;
}

export async function update(
  columnId: string,
  userId: string,
  data: UpdateColumnInput,
): Promise<ColumnRow> {
  const { projectId } = await getColumnWithBoard(columnId);
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  const updated = await db
    .update(columns)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(columns.id, columnId))
    .returning();

  const column = updated[0];
  if (!column) {
    throw new NotFoundError('Column', columnId);
  }

  // Broadcast to board room
  broadcastColumnUpdated(column.boardId, column, userId);

  logger.info({ columnId, userId }, 'Column updated');
  return column;
}

export async function remove(columnId: string, userId: string): Promise<void> {
  const { column, projectId } = await getColumnWithBoard(columnId);
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner', 'admin']);

  // Check if the column has tasks
  const columnTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.columnId, columnId))
    .limit(1);

  if (columnTasks.length > 0) {
    // Find another column in the same board to move tasks to
    const otherColumns = await db
      .select({ id: columns.id })
      .from(columns)
      .where(
        and(
          eq(columns.boardId, column.boardId),
        ),
      )
      .orderBy(asc(columns.position));

    const targetColumn = otherColumns.find((col) => col.id !== columnId);

    if (!targetColumn) {
      throw new ValidationError('Cannot delete the only column that contains tasks');
    }

    // Move all tasks to the target column
    await db
      .update(tasks)
      .set({ columnId: targetColumn.id, updatedAt: new Date().toISOString() })
      .where(eq(tasks.columnId, columnId));

    logger.info(
      { columnId, targetColumnId: targetColumn.id },
      'Tasks moved to another column before deletion',
    );
  }

  await db.delete(columns).where(eq(columns.id, columnId));

  // Broadcast to board room
  broadcastColumnDeleted(column.boardId, columnId, userId);

  logger.info({ columnId, boardId: column.boardId, userId }, 'Column deleted');
}

export async function reorder(
  boardId: string,
  userId: string,
  columnIds: string[],
): Promise<void> {
  const projectId = await getProjectIdForBoard(boardId);
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  // Verify all column IDs belong to this board
  const existingColumns = await db
    .select({ id: columns.id })
    .from(columns)
    .where(eq(columns.boardId, boardId));

  const existingIds = new Set(existingColumns.map((col) => col.id));

  for (const columnId of columnIds) {
    if (!existingIds.has(columnId)) {
      throw new ValidationError(`Column '${columnId}' does not belong to this board`);
    }
  }

  if (columnIds.length !== existingColumns.length) {
    throw new ValidationError('Column ID list must include all columns of the board');
  }

  const updates = columnIds.map((columnId, index) =>
    db
      .update(columns)
      .set({ position: index, updatedAt: new Date().toISOString() })
      .where(eq(columns.id, columnId)),
  );

  await Promise.all(updates);

  // Broadcast to board room
  broadcastColumnReordered(boardId, columnIds, userId);

  logger.info({ boardId, userId }, 'Columns reordered');
}
