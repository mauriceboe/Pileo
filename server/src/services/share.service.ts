import crypto from 'node:crypto';
import { eq, asc, inArray } from 'drizzle-orm';
import { sqlite, db } from '../config/database.js';
import { boards, columns, tasks, taskLabels, labels } from '../db/schema/index.js';
import { getMemberRole, requireRole } from './project.service.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../config/logger.js';

interface ShareTokenRow {
  id: string;
  board_id: string;
  token: string;
  created_by: string;
  created_at: string;
}

export async function createShareLink(
  boardId: string,
  userId: string,
): Promise<{ token: string; created: boolean }> {
  // Verify board exists and user has access
  const boardRows = await db
    .select({ projectId: boards.projectId })
    .from(boards)
    .where(eq(boards.id, boardId))
    .limit(1);

  const board = boardRows[0];
  if (!board) throw new NotFoundError('Board', boardId);

  const role = await getMemberRole(board.projectId, userId);
  requireRole(role, ['owner', 'admin']);

  // Check if a token already exists
  const existing = sqlite
    .prepare('SELECT token FROM share_tokens WHERE board_id = ?')
    .get(boardId) as { token: string } | undefined;

  if (existing) {
    return { token: existing.token, created: false };
  }

  const id = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString('base64url');
  const now = new Date().toISOString();

  sqlite
    .prepare('INSERT INTO share_tokens (id, board_id, token, created_by, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, boardId, token, userId, now);

  logger.info({ boardId, userId }, 'Share link created');
  return { token, created: true };
}

export async function getShareLink(
  boardId: string,
  userId: string,
): Promise<{ token: string; createdAt: string } | null> {
  const boardRows = await db
    .select({ projectId: boards.projectId })
    .from(boards)
    .where(eq(boards.id, boardId))
    .limit(1);

  const board = boardRows[0];
  if (!board) throw new NotFoundError('Board', boardId);

  const role = await getMemberRole(board.projectId, userId);
  if (!role) throw new NotFoundError('Board', boardId);

  const row = sqlite
    .prepare('SELECT token, created_at FROM share_tokens WHERE board_id = ?')
    .get(boardId) as { token: string; created_at: string } | undefined;

  if (!row) return null;
  return { token: row.token, createdAt: row.created_at };
}

export async function deleteShareLink(
  boardId: string,
  userId: string,
): Promise<void> {
  const boardRows = await db
    .select({ projectId: boards.projectId })
    .from(boards)
    .where(eq(boards.id, boardId))
    .limit(1);

  const board = boardRows[0];
  if (!board) throw new NotFoundError('Board', boardId);

  const role = await getMemberRole(board.projectId, userId);
  requireRole(role, ['owner', 'admin']);

  sqlite.prepare('DELETE FROM share_tokens WHERE board_id = ?').run(boardId);
  logger.info({ boardId, userId }, 'Share link deleted');
}

/**
 * Public endpoint — returns board data for a valid share token.
 * Only returns column names/colors and task titles (no details).
 */
export async function getSharedBoardData(
  token: string,
): Promise<Record<string, unknown> | null> {
  const shareRow = sqlite
    .prepare('SELECT * FROM share_tokens WHERE token = ?')
    .get(token) as ShareTokenRow | undefined;

  if (!shareRow) return null;

  const boardId = shareRow.board_id;

  // Get board info
  const boardRows = await db
    .select({ id: boards.id, name: boards.name })
    .from(boards)
    .where(eq(boards.id, boardId))
    .limit(1);

  const board = boardRows[0];
  if (!board) return null;

  // Get columns
  const boardColumns = await db
    .select({
      id: columns.id,
      name: columns.name,
      color: columns.color,
      icon: columns.icon,
      position: columns.position,
    })
    .from(columns)
    .where(eq(columns.boardId, boardId))
    .orderBy(asc(columns.position));

  const columnIds = boardColumns.map((c) => c.id);

  let tasksByColumn: Record<string, Array<{ id: string; title: string; description: string | null; position: number; priority: string; dueDate: string | null; completedAt: string | null; rejectedAt: string | null; labels: Array<{ name: string; color: string }> }>> = {};
  for (const colId of columnIds) {
    tasksByColumn[colId] = [];
  }

  if (columnIds.length > 0) {
    const allTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        columnId: tasks.columnId,
        position: tasks.position,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        rejectedAt: tasks.rejectedAt,
      })
      .from(tasks)
      .where(inArray(tasks.columnId, columnIds))
      .orderBy(asc(tasks.position));

    const taskIds = allTasks.map((t) => t.id);

    // Load labels for all tasks
    const labelsByTask = new Map<string, Array<{ name: string; color: string }>>();
    if (taskIds.length > 0) {
      const labelRows = await db
        .select({
          taskId: taskLabels.taskId,
          name: labels.name,
          color: labels.color,
        })
        .from(taskLabels)
        .innerJoin(labels, eq(taskLabels.labelId, labels.id))
        .where(inArray(taskLabels.taskId, taskIds));

      for (const row of labelRows) {
        const existing = labelsByTask.get(row.taskId) ?? [];
        existing.push({ name: row.name, color: row.color });
        labelsByTask.set(row.taskId, existing);
      }
    }

    for (const task of allTasks) {
      tasksByColumn[task.columnId]?.push({
        id: task.id,
        title: task.title,
        description: task.description,
        position: task.position,
        priority: task.priority,
        dueDate: task.dueDate,
        completedAt: task.completedAt,
        rejectedAt: task.rejectedAt,
        labels: labelsByTask.get(task.id) ?? [],
      });
    }
  }

  return {
    board: { id: board.id, name: board.name },
    columns: boardColumns,
    tasksByColumn,
  };
}
