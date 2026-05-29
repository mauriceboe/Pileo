import { eq, and, asc, gt, lt, gte, lte, sql, inArray } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  tasks,
  taskAssignees,
  taskLabels,
  columns,
  boards,
  labels,
  users,
  comments,
  checklistItems,
  attachments,
  projectMembers,
  notifications,
  taskLinks,
} from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../utils/errors.js';
import { getMemberRole, requireRole } from './project.service.js';
import * as activityService from './activity.service.js';
import { sanitizeRichText } from '../utils/sanitize-html.js';
import { broadcastTaskCreated, broadcastTaskUpdated, broadcastTaskDeleted, broadcastTaskMoved } from '../websocket/handlers/task.handler.js';
import * as customFieldService from './custom-field.service.js';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
  UpdateTaskAssigneesInput,
  UpdateTaskLabelsInput,
} from '@pileo/shared';

type TaskRow = typeof tasks.$inferSelect;

// -- Helpers --

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

async function resolveColumnContext(columnId: string): Promise<{ boardId: string; projectId: string }> {
  const rows = await db
    .select({
      boardId: columns.boardId,
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

// -- Shared enrichment helper --

async function getEnrichedTask(taskId: string): Promise<Record<string, unknown>> {
  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  const task = taskRows[0];
  if (!task) {
    throw new NotFoundError('Task', taskId);
  }

  const projectRows = await db
    .select({ projectId: boards.projectId })
    .from(columns)
    .innerJoin(boards, eq(columns.boardId, boards.id))
    .where(eq(columns.id, task.columnId))
    .limit(1);
  const projectId = projectRows[0]?.projectId;

  const [assigneeRows, labelRows, checklistTotalRows, checklistCompletedRows, commentCountRows, attachmentCountRows, linkCountRows] = await Promise.all([
    db
      .select({
        userId: taskAssignees.userId,
        username: users.username,
        displayName: users.displayName,
        avatarPath: users.avatarPath,
      })
      .from(taskAssignees)
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .where(eq(taskAssignees.taskId, taskId)),
    db
      .select({
        labelId: taskLabels.labelId,
        name: labels.name,
        color: labels.color,
      })
      .from(taskLabels)
      .innerJoin(labels, eq(taskLabels.labelId, labels.id))
      .where(eq(taskLabels.taskId, taskId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(checklistItems)
      .where(eq(checklistItems.taskId, taskId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(checklistItems)
      .where(and(eq(checklistItems.taskId, taskId), eq(checklistItems.isCompleted, true))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.taskId, taskId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(attachments)
      .where(eq(attachments.taskId, taskId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(taskLinks)
      .where(eq(taskLinks.taskId, taskId)),
  ]);

  const customBadges: Array<{ fieldName: string; value: string }> = [];
  if (projectId) {
    const cardFields = customFieldService
      .listFields(projectId)
      .filter((f) => f.showOnCard && f.isEnabled);
    if (cardFields.length > 0) {
      const fieldMap = new Map(cardFields.map((f) => [f.id, f]));
      const taskValues = customFieldService.getTaskValues(taskId);
      for (const cv of taskValues) {
        const field = fieldMap.get(cv.fieldId);
        if (field && cv.value) {
          customBadges.push({ fieldName: field.name, value: cv.value });
        }
      }
    }
  }

  return {
    ...task,
    assignees: assigneeRows,
    labels: labelRows,
    commentCount: commentCountRows[0]?.count ?? 0,
    checklistTotal: checklistTotalRows[0]?.count ?? 0,
    checklistCompleted: checklistCompletedRows[0]?.count ?? 0,
    attachmentCount: attachmentCountRows[0]?.count ?? 0,
    linkCount: linkCountRows[0]?.count ?? 0,
    customBadges,
  };
}

// -- CRUD --

export async function create(
  columnId: string,
  userId: string,
  data: CreateTaskInput,
): Promise<TaskRow> {
  const { boardId, projectId } = await resolveColumnContext(columnId);
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  // Auto-position at end of column
  const existingTasks = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(eq(tasks.columnId, columnId))
    .orderBy(asc(tasks.position));

  const nextPosition = existingTasks.length > 0
    ? existingTasks[existingTasks.length - 1]!.position + 1
    : 0;

  const inserted = await db
    .insert(tasks)
    .values({
      columnId,
      title: data.title,
      description: sanitizeRichText(data.description ?? null),
      position: nextPosition,
      priority: data.priority ?? 'none',
      dueDate: data.dueDate?.toISOString() ?? null,
      creatorId: userId,
    })
    .returning();

  const task = inserted[0]!;

  await activityService.log(projectId, task.id, userId, 'task.created', {
    title: task.title,
  });

  const enrichedTask = {
    ...task,
    labels: [],
    assignees: [],
    commentCount: 0,
    checklistTotal: 0,
    checklistCompleted: 0,
    attachmentCount: 0,
    linkCount: 0,
  };

  // Broadcast to board room
  broadcastTaskCreated(boardId, enrichedTask, userId);

  logger.info({ taskId: task.id, columnId, userId }, 'Task created');
  return enrichedTask;
}

export async function list(
  boardId: string,
  userId: string,
): Promise<Record<string, unknown[]>> {
  // Verify board exists and user has access
  const boardRows = await db
    .select({ projectId: boards.projectId })
    .from(boards)
    .where(eq(boards.id, boardId))
    .limit(1);

  const boardRow = boardRows[0];
  if (!boardRow) {
    throw new NotFoundError('Board', boardId);
  }

  const role = await getMemberRole(boardRow.projectId, userId);
  if (!role) {
    throw new NotFoundError('Board', boardId);
  }

  // Get all columns for this board
  const boardColumns = await db
    .select({ id: columns.id })
    .from(columns)
    .where(eq(columns.boardId, boardId));

  const columnIds = boardColumns.map((col) => col.id);

  if (columnIds.length === 0) {
    return {};
  }

  // Get all tasks for these columns
  const allTasks = await db
    .select()
    .from(tasks)
    .where(inArray(tasks.columnId, columnIds))
    .orderBy(asc(tasks.position));

  const taskIds = allTasks.map((task) => task.id);

  if (taskIds.length === 0) {
    // Return empty arrays for each column
    const result: Record<string, unknown[]> = {};
    for (const colId of columnIds) {
      result[colId] = [];
    }
    return result;
  }

  // Fetch assignees, labels, and counts in parallel
  const [assigneeRows, labelRows, commentCountRows, checklistTotalRows, checklistCompletedRows, attachmentCountRows, linkCountRows] = await Promise.all([
    db
      .select({
        taskId: taskAssignees.taskId,
        userId: taskAssignees.userId,
        username: users.username,
        displayName: users.displayName,
        avatarPath: users.avatarPath,
      })
      .from(taskAssignees)
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .where(inArray(taskAssignees.taskId, taskIds)),
    db
      .select({
        taskId: taskLabels.taskId,
        labelId: taskLabels.labelId,
        name: labels.name,
        color: labels.color,
      })
      .from(taskLabels)
      .innerJoin(labels, eq(taskLabels.labelId, labels.id))
      .where(inArray(taskLabels.taskId, taskIds)),
    db
      .select({ taskId: comments.taskId, count: sql<number>`count(*)` })
      .from(comments)
      .where(inArray(comments.taskId, taskIds))
      .groupBy(comments.taskId),
    db
      .select({ taskId: checklistItems.taskId, count: sql<number>`count(*)` })
      .from(checklistItems)
      .where(inArray(checklistItems.taskId, taskIds))
      .groupBy(checklistItems.taskId),
    db
      .select({ taskId: checklistItems.taskId, count: sql<number>`count(*)` })
      .from(checklistItems)
      .where(and(inArray(checklistItems.taskId, taskIds), eq(checklistItems.isCompleted, true)))
      .groupBy(checklistItems.taskId),
    db
      .select({ taskId: attachments.taskId, count: sql<number>`count(*)` })
      .from(attachments)
      .where(inArray(attachments.taskId, taskIds))
      .groupBy(attachments.taskId),
    db
      .select({ taskId: taskLinks.taskId, count: sql<number>`count(*)` })
      .from(taskLinks)
      .where(inArray(taskLinks.taskId, taskIds))
      .groupBy(taskLinks.taskId),
  ]);

  // Index by taskId
  const assigneesByTask = new Map<string, typeof assigneeRows>();
  for (const row of assigneeRows) {
    const existing = assigneesByTask.get(row.taskId) ?? [];
    existing.push(row);
    assigneesByTask.set(row.taskId, existing);
  }

  const labelsByTask = new Map<string, typeof labelRows>();
  for (const row of labelRows) {
    const existing = labelsByTask.get(row.taskId) ?? [];
    existing.push(row);
    labelsByTask.set(row.taskId, existing);
  }

  const commentCountByTask = new Map(commentCountRows.map((r) => [r.taskId, r.count]));
  const checklistTotalByTask = new Map(checklistTotalRows.map((r) => [r.taskId, r.count]));
  const checklistCompletedByTask = new Map(checklistCompletedRows.map((r) => [r.taskId, r.count]));
  const attachmentCountByTask = new Map(attachmentCountRows.map((r) => [r.taskId, r.count]));
  const linkCountByTask = new Map(linkCountRows.map((r) => [r.taskId, r.count]));

  // Load custom field card badges
  const projectFields = customFieldService.listFields(boardRow.projectId);
  const cardFields = projectFields.filter((f) => f.showOnCard && f.isEnabled);
  const customValuesByTask = cardFields.length > 0
    ? customFieldService.getTasksValues(taskIds)
    : new Map<string, { fieldId: string; value: string }[]>();

  const cardFieldMap = new Map(cardFields.map((f) => [f.id, f]));

  // Group tasks by column with enriched data
  const result: Record<string, unknown[]> = {};
  for (const colId of columnIds) {
    result[colId] = [];
  }

  for (const task of allTasks) {
    // Build custom badges for this task
    const customBadges: Array<{ fieldName: string; value: string }> = [];
    const taskCustomValues = customValuesByTask.get(task.id) ?? [];
    for (const cv of taskCustomValues) {
      const field = cardFieldMap.get(cv.fieldId);
      if (field && cv.value) {
        customBadges.push({ fieldName: field.name, value: cv.value });
      }
    }

    const enriched = {
      ...task,
      assignees: assigneesByTask.get(task.id) ?? [],
      labels: labelsByTask.get(task.id) ?? [],
      commentCount: commentCountByTask.get(task.id) ?? 0,
      checklistTotal: checklistTotalByTask.get(task.id) ?? 0,
      checklistCompleted: checklistCompletedByTask.get(task.id) ?? 0,
      attachmentCount: attachmentCountByTask.get(task.id) ?? 0,
      linkCount: linkCountByTask.get(task.id) ?? 0,
      customBadges,
    };
    result[task.columnId]!.push(enriched);
  }

  return result;
}

export async function getById(
  taskId: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  if (!role) {
    throw new NotFoundError('Task', taskId);
  }

  return getEnrichedTask(taskId);
}

export async function update(
  taskId: string,
  userId: string,
  data: UpdateTaskInput,
): Promise<Record<string, unknown>> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  // Fetch old values for activity diff
  const oldTask = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  const old = oldTask[0]!;

  const setData: Record<string, unknown> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  if (data.description !== undefined) {
    setData.description = sanitizeRichText(data.description);
  }
  if (data.dueDate !== undefined) {
    setData.dueDate = data.dueDate?.toISOString() ?? null;
  }
  if (data.completedAt !== undefined) {
    setData.completedAt = data.completedAt instanceof Date
      ? data.completedAt.toISOString()
      : data.completedAt ?? null;
  }
  if (data.rejectedAt !== undefined) {
    setData.rejectedAt = data.rejectedAt instanceof Date
      ? data.rejectedAt.toISOString()
      : data.rejectedAt ?? null;
  }

  const updated = await db
    .update(tasks)
    .set(setData)
    .where(eq(tasks.id, taskId))
    .returning();

  const task = updated[0];
  if (!task) {
    throw new NotFoundError('Task', taskId);
  }

  // Build diff details for activity log
  const changes: Record<string, { oldValue: unknown; newValue: unknown }> = {};
  if (data.title !== undefined && data.title !== old.title) {
    changes.title = { oldValue: old.title, newValue: data.title };
  }
  if (data.description !== undefined && data.description !== old.description) {
    changes.description = { oldValue: old.description, newValue: data.description };
  }
  if (data.priority !== undefined && data.priority !== old.priority) {
    changes.priority = { oldValue: old.priority, newValue: data.priority };
  }
  if (data.dueDate !== undefined) {
    const oldDue = old.dueDate ?? null;
    const newDue = data.dueDate ?? null;
    if (oldDue !== newDue) {
      changes.dueDate = { oldValue: oldDue, newValue: newDue };
    }
  }
  if (data.completedAt !== undefined) {
    const oldCompleted = old.completedAt ?? null;
    const newCompleted = data.completedAt ?? null;
    if (!!oldCompleted !== !!newCompleted) {
      changes.completedAt = { oldValue: oldCompleted, newValue: newCompleted };
    }
  }
  if (data.rejectedAt !== undefined) {
    const oldRejected = old.rejectedAt ?? null;
    const newRejected = data.rejectedAt ?? null;
    if (!!oldRejected !== !!newRejected) {
      changes.rejectedAt = { oldValue: oldRejected, newValue: newRejected };
    }
  }

  if (Object.keys(changes).length > 0) {
    await activityService.log(context.projectId, taskId, userId, 'task.updated', changes);
  }

  const enrichedTask = await getEnrichedTask(taskId);

  // Broadcast to board room
  broadcastTaskUpdated(context.boardId, enrichedTask, userId);

  logger.info({ taskId, userId }, 'Task updated');
  return enrichedTask;
}

export async function remove(
  taskId: string,
  userId: string,
): Promise<void> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);

  // Require admin/owner OR task creator
  const taskRow = await db
    .select({ creatorId: tasks.creatorId, title: tasks.title })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  const task = taskRow[0];
  if (!task) {
    throw new NotFoundError('Task', taskId);
  }

  const isCreator = task.creatorId === userId;
  const isAdminOrOwner = role === 'owner' || role === 'admin';

  if (!isCreator && !isAdminOrOwner) {
    throw new ForbiddenError();
  }

  await db.delete(tasks).where(eq(tasks.id, taskId));

  await activityService.log(context.projectId, null, userId, 'task.deleted', {
    taskId,
    title: task.title,
  });

  // Broadcast to board room
  broadcastTaskDeleted(context.boardId, taskId, userId);

  logger.info({ taskId, userId }, 'Task deleted');
}

export async function updateAssignees(
  taskId: string,
  userId: string,
  data: UpdateTaskAssigneesInput,
): Promise<Record<string, unknown>> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  // Verify users being added are project members
  if (data.add.length > 0) {
    const memberRows = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, context.projectId),
          inArray(projectMembers.userId, data.add),
        ),
      );

    const memberUserIds = new Set(memberRows.map((row) => row.userId));
    for (const addUserId of data.add) {
      if (!memberUserIds.has(addUserId)) {
        throw new ValidationError(`User '${addUserId}' is not a member of this project`);
      }
    }
  }

  // Remove assignees
  if (data.remove.length > 0) {
    for (const removeUserId of data.remove) {
      await db
        .delete(taskAssignees)
        .where(
          and(
            eq(taskAssignees.taskId, taskId),
            eq(taskAssignees.userId, removeUserId),
          ),
        );
    }
  }

  // Add assignees
  if (data.add.length > 0) {
    const values = data.add.map((assigneeUserId) => ({
      taskId,
      userId: assigneeUserId,
    }));

    await db
      .insert(taskAssignees)
      .values(values)
      .onConflictDoNothing();

    // Send notifications for new assignments
    const taskRow = await db
      .select({ title: tasks.title })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    const taskTitle = taskRow[0]?.title ?? 'Unknown task';

    const notificationValues = data.add
      .filter((assigneeUserId) => assigneeUserId !== userId)
      .map((assigneeUserId) => ({
        userId: assigneeUserId,
        type: 'assignment' as const,
        title: 'New task assignment',
        message: `You have been assigned to "${taskTitle}"`,
        resourceType: 'task' as const,
        resourceId: taskId,
      }));

    if (notificationValues.length > 0) {
      await db.insert(notifications).values(notificationValues);
    }
  }

  const resolvedAdded = data.add.length > 0
    ? await db.select({ id: users.id, displayName: users.displayName }).from(users).where(inArray(users.id, data.add))
    : [];
  const resolvedRemoved = data.remove.length > 0
    ? await db.select({ id: users.id, displayName: users.displayName }).from(users).where(inArray(users.id, data.remove))
    : [];

  // Bump task.updatedAt so clients refetch activity/details via the shared signal
  await db
    .update(tasks)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, taskId));

  await activityService.log(context.projectId, taskId, userId, 'task.assignees.updated', {
    added: data.add,
    removed: data.remove,
    addedNames: resolvedAdded.map((u) => u.displayName),
    removedNames: resolvedRemoved.map((u) => u.displayName),
  });

  logger.info({ taskId, userId, added: data.add.length, removed: data.remove.length }, 'Task assignees updated');
  return getEnrichedTask(taskId);
}

export async function updateLabels(
  taskId: string,
  userId: string,
  data: UpdateTaskLabelsInput,
): Promise<Record<string, unknown>> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  // Verify labels belong to the same project
  if (data.add.length > 0) {
    const labelRows = await db
      .select({ id: labels.id, projectId: labels.projectId })
      .from(labels)
      .where(inArray(labels.id, data.add));

    for (const label of labelRows) {
      if (label.projectId !== context.projectId) {
        throw new ValidationError(`Label '${label.id}' does not belong to this project`);
      }
    }

    // Check all requested labels exist
    const foundIds = new Set(labelRows.map((row) => row.id));
    for (const labelId of data.add) {
      if (!foundIds.has(labelId)) {
        throw new NotFoundError('Label', labelId);
      }
    }
  }

  // Remove labels
  if (data.remove.length > 0) {
    for (const labelId of data.remove) {
      await db
        .delete(taskLabels)
        .where(
          and(
            eq(taskLabels.taskId, taskId),
            eq(taskLabels.labelId, labelId),
          ),
        );
    }
  }

  // Add labels
  if (data.add.length > 0) {
    const values = data.add.map((labelId) => ({
      taskId,
      labelId,
    }));

    await db
      .insert(taskLabels)
      .values(values)
      .onConflictDoNothing();
  }

  const resolvedAddedLabels = data.add.length > 0
    ? await db.select({ id: labels.id, name: labels.name, color: labels.color }).from(labels).where(inArray(labels.id, data.add))
    : [];
  const resolvedRemovedLabels = data.remove.length > 0
    ? await db.select({ id: labels.id, name: labels.name, color: labels.color }).from(labels).where(inArray(labels.id, data.remove))
    : [];

  await db
    .update(tasks)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, taskId));

  await activityService.log(context.projectId, taskId, userId, 'task.labels.updated', {
    added: data.add,
    removed: data.remove,
    addedLabels: resolvedAddedLabels,
    removedLabels: resolvedRemovedLabels,
  });

  logger.info({ taskId, userId, added: data.add.length, removed: data.remove.length }, 'Task labels updated');
  return getEnrichedTask(taskId);
}

// -- Move Logic (Step 16) --

export async function move(
  taskId: string,
  userId: string,
  data: MoveTaskInput,
): Promise<TaskRow> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  const targetColumnId = data.columnId;
  const targetPosition = data.position;

  // Resolve target column
  const targetColumnRows = await db
    .select({
      id: columns.id,
      boardId: columns.boardId,
      name: columns.name,
      color: columns.color,
      icon: columns.icon,
      isCompleted: columns.isCompleted,
      isRejected: columns.isRejected,
    })
    .from(columns)
    .where(eq(columns.id, targetColumnId))
    .limit(1);

  const targetColumn = targetColumnRows[0];
  if (!targetColumn) {
    throw new NotFoundError('Column', targetColumnId);
  }

  // Verify both columns belong to the same board
  const sourceColumnRows = await db
    .select({
      id: columns.id,
      boardId: columns.boardId,
      name: columns.name,
      color: columns.color,
      icon: columns.icon,
      isCompleted: columns.isCompleted,
      isRejected: columns.isRejected,
    })
    .from(columns)
    .where(eq(columns.id, context.columnId))
    .limit(1);

  const sourceColumn = sourceColumnRows[0]!;

  if (sourceColumn.boardId !== targetColumn.boardId) {
    throw new ValidationError('Cannot move task between different boards');
  }

  // Get current task position
  const currentTaskRows = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  const currentPosition = currentTaskRows[0]!.position;
  const sameColumn = context.columnId === targetColumnId;

  // Sequential updates (better-sqlite3 is synchronous/single-threaded, so atomicity is inherent)
  let result: TaskRow;

  if (sameColumn) {
    if (currentPosition === targetPosition) {
      const taskRows = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);
      result = taskRows[0]!;
    } else {
      if (targetPosition > currentPosition) {
        await db
          .update(tasks)
          .set({ position: sql`${tasks.position} - 1`, updatedAt: new Date().toISOString() })
          .where(
            and(
              eq(tasks.columnId, context.columnId),
              gt(tasks.position, currentPosition),
              lte(tasks.position, targetPosition),
            ),
          );
      } else {
        await db
          .update(tasks)
          .set({ position: sql`${tasks.position} + 1`, updatedAt: new Date().toISOString() })
          .where(
            and(
              eq(tasks.columnId, context.columnId),
              gte(tasks.position, targetPosition),
              lt(tasks.position, currentPosition),
            ),
          );
      }

      const updated = await db
        .update(tasks)
        .set({ position: targetPosition, updatedAt: new Date().toISOString() })
        .where(eq(tasks.id, taskId))
        .returning();

      result = updated[0]!;
    }
  } else {
    // Different column move
    await db
      .update(tasks)
      .set({ position: sql`${tasks.position} - 1`, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(tasks.columnId, context.columnId),
          gt(tasks.position, currentPosition),
        ),
      );

    await db
      .update(tasks)
      .set({ position: sql`${tasks.position} + 1`, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(tasks.columnId, targetColumnId),
          gte(tasks.position, targetPosition),
        ),
      );

    // Determine completedAt:
    // - Target column is "completed" → always set completedAt (auto)
    // - Source column was "completed" and target is not → clear completedAt (was auto-set by rule)
    // - Source column was NOT "completed" → keep existing completedAt (was manually set)
    const setFields: Record<string, unknown> = {
      columnId: targetColumnId,
      position: targetPosition,
      updatedAt: new Date().toISOString(),
    };

    if (targetColumn.isCompleted) {
      setFields.completedAt = new Date().toISOString();
    } else if (sourceColumn.isCompleted) {
      setFields.completedAt = null;
    }

    if (targetColumn.isRejected) {
      setFields.rejectedAt = new Date().toISOString();
    } else if (sourceColumn.isRejected) {
      setFields.rejectedAt = null;
    }

    const updated = await db
      .update(tasks)
      .set(setFields)
      .where(eq(tasks.id, taskId))
      .returning();

    result = updated[0]!;
  }

  // Log activity with column names, colors, icons for rich badges
  if (!sameColumn) {
    await activityService.log(context.projectId, taskId, userId, 'task.moved', {
      oldColumn: sourceColumn.name,
      newColumn: targetColumn.name,
      oldColumnColor: sourceColumn.color,
      newColumnColor: targetColumn.color,
      oldColumnIcon: sourceColumn.icon,
      newColumnIcon: targetColumn.icon,
      oldColumnId: context.columnId,
      newColumnId: targetColumnId,
    });
  } else {
    await activityService.log(context.projectId, taskId, userId, 'task.moved', {
      column: sourceColumn.name,
      columnColor: sourceColumn.color,
      columnIcon: sourceColumn.icon,
      oldPosition: currentPosition,
      newPosition: targetPosition,
    });
  }

  // Broadcast to board room
  broadcastTaskMoved(
    context.boardId,
    {
      taskId,
      fromColumnId: context.columnId,
      toColumnId: targetColumnId,
      position: targetPosition,
    },
    userId,
  );

  logger.info({ taskId, userId, from: context.columnId, to: targetColumnId, position: targetPosition }, 'Task moved');
  return result;
}

export async function getContext(
  taskId: string,
  userId: string,
): Promise<{ taskId: string; boardId: string; projectId: string }> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  if (!role) {
    throw new NotFoundError('Task', taskId);
  }
  return { taskId: context.taskId, boardId: context.boardId, projectId: context.projectId };
}

// -- Bulk operations (cross-column, cross-board within same project) --

interface BulkResult {
  moved?: number;
  duplicated?: number;
  affectedBoardIds: string[];
}

interface BulkSourceTask {
  id: string;
  columnId: string;
  boardId: string;
  projectId: string;
  sourceIsCompleted: boolean;
  sourceIsRejected: boolean;
}

async function loadBulkContext(
  taskIds: string[],
  targetColumnId: string,
  userId: string,
): Promise<{
  sourceTasks: BulkSourceTask[];
  target: { columnId: string; boardId: string; projectId: string; isCompleted: boolean; isRejected: boolean };
}> {
  if (taskIds.length === 0) {
    throw new ValidationError('No tasks provided');
  }

  const targetRows = await db
    .select({
      columnId: columns.id,
      boardId: columns.boardId,
      projectId: boards.projectId,
      isCompleted: columns.isCompleted,
      isRejected: columns.isRejected,
    })
    .from(columns)
    .innerJoin(boards, eq(columns.boardId, boards.id))
    .where(eq(columns.id, targetColumnId))
    .limit(1);

  const target = targetRows[0];
  if (!target) {
    throw new NotFoundError('Column', targetColumnId);
  }

  const sourceRows = await db
    .select({
      id: tasks.id,
      columnId: tasks.columnId,
      boardId: columns.boardId,
      projectId: boards.projectId,
      sourceIsCompleted: columns.isCompleted,
      sourceIsRejected: columns.isRejected,
    })
    .from(tasks)
    .innerJoin(columns, eq(tasks.columnId, columns.id))
    .innerJoin(boards, eq(columns.boardId, boards.id))
    .where(inArray(tasks.id, taskIds));

  if (sourceRows.length !== taskIds.length) {
    throw new NotFoundError('Task', 'One or more tasks not found');
  }

  for (const source of sourceRows) {
    if (source.projectId !== target.projectId) {
      throw new ValidationError('Bulk operations must stay within the same project');
    }
  }

  const role = await getMemberRole(target.projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  return { sourceTasks: sourceRows, target };
}

export async function bulkMove(
  taskIds: string[],
  targetColumnId: string,
  userId: string,
): Promise<BulkResult> {
  const { sourceTasks, target } = await loadBulkContext(taskIds, targetColumnId, userId);

  const existingTargetTasks = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(eq(tasks.columnId, target.columnId))
    .orderBy(asc(tasks.position));

  let nextPosition = existingTargetTasks.length > 0
    ? existingTargetTasks[existingTargetTasks.length - 1]!.position + 1
    : 0;

  const affectedBoards = new Set<string>([target.boardId]);
  const nowIso = new Date().toISOString();

  for (const source of sourceTasks) {
    const setFields: Record<string, unknown> = {
      columnId: target.columnId,
      position: nextPosition,
      updatedAt: nowIso,
    };
    if (target.isCompleted) {
      setFields.completedAt = nowIso;
    } else if (source.sourceIsCompleted) {
      setFields.completedAt = null;
    }
    if (target.isRejected) {
      setFields.rejectedAt = nowIso;
    } else if (source.sourceIsRejected) {
      setFields.rejectedAt = null;
    }

    await db
      .update(tasks)
      .set(setFields)
      .where(eq(tasks.id, source.id));

    affectedBoards.add(source.boardId);
    nextPosition += 1;

    broadcastTaskMoved(
      source.boardId,
      {
        taskId: source.id,
        fromColumnId: source.columnId,
        toColumnId: target.columnId,
        position: nextPosition - 1,
      },
      userId,
    );

    if (source.boardId !== target.boardId) {
      broadcastTaskMoved(
        target.boardId,
        {
          taskId: source.id,
          fromColumnId: source.columnId,
          toColumnId: target.columnId,
          position: nextPosition - 1,
        },
        userId,
      );
    }
  }

  // Re-pack positions in each affected source column
  const sourceColumnIds = Array.from(new Set(sourceTasks.map((t) => t.columnId).filter((id) => id !== target.columnId)));
  for (const columnId of sourceColumnIds) {
    const remaining = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.columnId, columnId))
      .orderBy(asc(tasks.position));

    for (let index = 0; index < remaining.length; index += 1) {
      await db
        .update(tasks)
        .set({ position: index, updatedAt: nowIso })
        .where(eq(tasks.id, remaining[index]!.id));
    }
  }

  try {
    await activityService.log(target.projectId, target.columnId, userId, 'task.bulk_moved', {
      count: sourceTasks.length,
      targetColumnId: target.columnId,
    });
  } catch {
    // best-effort
  }

  logger.info({ userId, count: sourceTasks.length, targetColumnId }, 'Tasks bulk-moved');

  return { moved: sourceTasks.length, affectedBoardIds: Array.from(affectedBoards) };
}

export async function bulkDuplicate(
  taskIds: string[],
  targetColumnId: string,
  userId: string,
): Promise<BulkResult> {
  const { sourceTasks, target } = await loadBulkContext(taskIds, targetColumnId, userId);

  const existingTargetTasks = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(eq(tasks.columnId, target.columnId))
    .orderBy(asc(tasks.position));

  let nextPosition = existingTargetTasks.length > 0
    ? existingTargetTasks[existingTargetTasks.length - 1]!.position + 1
    : 0;

  const sourceTaskIds = sourceTasks.map((t) => t.id);

  const originals = await db
    .select()
    .from(tasks)
    .where(inArray(tasks.id, sourceTaskIds));
  const originalsById = new Map(originals.map((t) => [t.id, t]));

  const originalLabels = sourceTaskIds.length > 0
    ? await db
      .select({ taskId: taskLabels.taskId, labelId: taskLabels.labelId })
      .from(taskLabels)
      .where(inArray(taskLabels.taskId, sourceTaskIds))
    : [];

  const originalAssignees = sourceTaskIds.length > 0
    ? await db
      .select({ taskId: taskAssignees.taskId, userId: taskAssignees.userId })
      .from(taskAssignees)
      .where(inArray(taskAssignees.taskId, sourceTaskIds))
    : [];

  const labelsByTask = new Map<string, string[]>();
  for (const row of originalLabels) {
    const list = labelsByTask.get(row.taskId) ?? [];
    list.push(row.labelId);
    labelsByTask.set(row.taskId, list);
  }

  const assigneesByTask = new Map<string, string[]>();
  for (const row of originalAssignees) {
    const list = assigneesByTask.get(row.taskId) ?? [];
    list.push(row.userId);
    assigneesByTask.set(row.taskId, list);
  }

  let duplicatedCount = 0;

  for (const sourceId of sourceTaskIds) {
    const original = originalsById.get(sourceId);
    if (!original) continue;

    const nowIso = new Date().toISOString();
    const inserted = await db
      .insert(tasks)
      .values({
        columnId: target.columnId,
        title: original.title,
        description: original.description,
        position: nextPosition,
        priority: original.priority,
        dueDate: original.dueDate,
        creatorId: userId,
        completedAt: target.isCompleted ? nowIso : null,
        rejectedAt: target.isRejected ? nowIso : null,
      })
      .returning();

    const newTask = inserted[0]!;
    nextPosition += 1;
    duplicatedCount += 1;

    const labelIds = labelsByTask.get(sourceId) ?? [];
    if (labelIds.length > 0) {
      await db.insert(taskLabels).values(labelIds.map((labelId) => ({ taskId: newTask.id, labelId })));
    }

    const assigneeIds = assigneesByTask.get(sourceId) ?? [];
    if (assigneeIds.length > 0) {
      await db.insert(taskAssignees).values(assigneeIds.map((uid) => ({ taskId: newTask.id, userId: uid })));
    }

    const enriched = {
      ...newTask,
      labels: [],
      assignees: [],
      commentCount: 0,
      checklistTotal: 0,
      checklistCompleted: 0,
      attachmentCount: 0,
      linkCount: 0,
    };
    broadcastTaskCreated(target.boardId, enriched, userId);
  }

  logger.info({ userId, count: duplicatedCount, targetColumnId }, 'Tasks bulk-duplicated');

  return { duplicated: duplicatedCount, affectedBoardIds: [target.boardId] };
}
