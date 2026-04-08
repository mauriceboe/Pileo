import { randomUUID } from 'node:crypto';
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { projects } from './projects.js';
import { tasks } from './tasks.js';
import { users } from './users.js';

export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  details: text('details'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  taskCreatedIdx: index('activity_log_task_created_idx').on(table.taskId, table.createdAt),
}));
