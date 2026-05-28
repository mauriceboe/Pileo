import { eq, and, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { tasks, taskAssignees, columns, boards, notifications } from '../db/schema/index.js';

// Dashboard queries for a single user. Kept separate from user.service.ts
// because they aggregate across half the schema (tasks + assignees +
// columns + boards + notifications) rather than mutating the user row.

export interface AssignedTaskRow {
  id: string;
  title: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  columnId: string;
  columnName: string;
  columnColor: string;
  boardId: string;
  boardName: string;
  projectId: string;
  createdAt: string;
}

export interface DashboardStats {
  totalTasks: number;
  completed: number;
  inProgress: number;
  notifications: number;
}

export async function listAssignedTasks(userId: string): Promise<AssignedTaskRow[]> {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      columnId: tasks.columnId,
      columnName: columns.name,
      columnColor: columns.color,
      boardId: boards.id,
      boardName: boards.name,
      projectId: boards.projectId,
      createdAt: tasks.createdAt,
    })
    .from(taskAssignees)
    .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
    .innerJoin(columns, eq(tasks.columnId, columns.id))
    .innerJoin(boards, eq(columns.boardId, boards.id))
    .where(eq(taskAssignees.userId, userId))
    .orderBy(tasks.createdAt);
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [totalRows, completedRows, inProgressRows, notifRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(taskAssignees)
      .where(eq(taskAssignees.userId, userId)),
    db.select({ count: sql<number>`count(*)` })
      .from(taskAssignees)
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .where(and(eq(taskAssignees.userId, userId), isNotNull(tasks.completedAt))),
    db.select({ count: sql<number>`count(*)` })
      .from(taskAssignees)
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .where(and(eq(taskAssignees.userId, userId), isNull(tasks.completedAt))),
    db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))),
  ]);
  return {
    totalTasks: totalRows[0]?.count ?? 0,
    completed: completedRows[0]?.count ?? 0,
    inProgress: inProgressRows[0]?.count ?? 0,
    notifications: notifRows[0]?.count ?? 0,
  };
}
