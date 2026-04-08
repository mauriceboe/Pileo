import { randomUUID } from 'node:crypto';
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { columns } from './columns.js';
import { users } from './users.js';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  columnId: text('column_id').notNull().references(() => columns.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  position: integer('position').notNull().default(0),
  priority: text('priority', { enum: ['none', 'low', 'medium', 'high', 'urgent'] }).notNull().default('none'),
  dueDate: text('due_date'),
  completedAt: text('completed_at'),
  creatorId: text('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  columnPositionIdx: index('tasks_column_position_idx').on(table.columnId, table.position),
  dueDateIdx: index('tasks_due_date_idx').on(table.dueDate),
}));

export const taskAssignees = sqliteTable('task_assignees', {
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => ({
  taskUserIdx: uniqueIndex('task_assignees_task_user_idx').on(table.taskId, table.userId),
  taskIdx: index('task_assignees_task_idx').on(table.taskId),
  userIdx: index('task_assignees_user_idx').on(table.userId),
}));
