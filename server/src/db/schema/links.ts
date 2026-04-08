import { randomUUID } from 'node:crypto';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { tasks } from './tasks.js';
import { users } from './users.js';

export const taskLinks = sqliteTable('task_links', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  createdBy: text('created_by').references(() => users.id),
});
