import { eq, asc } from 'drizzle-orm';
import { db } from '../config/database.js';
import { boards, columns } from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import {
  NotFoundError,
  ValidationError,
} from '../utils/errors.js';
import { getMemberRole, requireRole } from './project.service.js';
import type { CreateBoardInput, UpdateBoardInput } from '@pileo/shared';

type BoardRow = typeof boards.$inferSelect;

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

export async function create(
  projectId: string,
  userId: string,
  data: CreateBoardInput,
): Promise<BoardRow> {
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  // Determine next position
  const existingBoards = await db
    .select({ position: boards.position })
    .from(boards)
    .where(eq(boards.projectId, projectId))
    .orderBy(asc(boards.position));

  const nextPosition = existingBoards.length > 0
    ? existingBoards[existingBoards.length - 1]!.position + 1
    : 0;

  const inserted = await db
    .insert(boards)
    .values({
      projectId,
      name: data.name,
      position: nextPosition,
    })
    .returning();

  const board = inserted[0]!;

  logger.info({ boardId: board.id, projectId, userId }, 'Board created');
  return board;
}

export async function list(projectId: string, userId: string): Promise<BoardRow[]> {
  const role = await getMemberRole(projectId, userId);
  if (!role) {
    throw new NotFoundError('Project', projectId);
  }

  return db
    .select()
    .from(boards)
    .where(eq(boards.projectId, projectId))
    .orderBy(asc(boards.position));
}

export async function getById(boardId: string, userId: string): Promise<BoardRow & { columns: (typeof columns.$inferSelect)[] }> {
  const projectId = await getProjectIdForBoard(boardId);
  const role = await getMemberRole(projectId, userId);
  if (!role) {
    throw new NotFoundError('Board', boardId);
  }

  const rows = await db
    .select()
    .from(boards)
    .where(eq(boards.id, boardId))
    .limit(1);

  const board = rows[0];
  if (!board) {
    throw new NotFoundError('Board', boardId);
  }

  const boardColumns = await db
    .select()
    .from(columns)
    .where(eq(columns.boardId, boardId))
    .orderBy(asc(columns.position));

  return { ...board, columns: boardColumns };
}

export async function update(
  boardId: string,
  userId: string,
  data: UpdateBoardInput,
): Promise<BoardRow> {
  const projectId = await getProjectIdForBoard(boardId);
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  const updated = await db
    .update(boards)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(boards.id, boardId))
    .returning();

  const board = updated[0];
  if (!board) {
    throw new NotFoundError('Board', boardId);
  }

  logger.info({ boardId, projectId, userId }, 'Board updated');
  return board;
}

export async function remove(boardId: string, userId: string): Promise<void> {
  const projectId = await getProjectIdForBoard(boardId);
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner', 'admin']);

  const deleted = await db
    .delete(boards)
    .where(eq(boards.id, boardId))
    .returning({ id: boards.id });

  if (deleted.length === 0) {
    throw new NotFoundError('Board', boardId);
  }

  logger.info({ boardId, projectId, userId }, 'Board deleted');
}

export async function reorderColumns(
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

  // Batch update positions
  const updates = columnIds.map((columnId, index) =>
    db
      .update(columns)
      .set({ position: index, updatedAt: new Date().toISOString() })
      .where(eq(columns.id, columnId)),
  );

  await Promise.all(updates);

  logger.info({ boardId, userId }, 'Columns reordered');
}

// Re-export for use by column service
export { getProjectIdForBoard };
