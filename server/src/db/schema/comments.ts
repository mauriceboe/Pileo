import { randomUUID } from 'node:crypto';
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { tasks } from './tasks.js';
import { users } from './users.js';

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  taskCreatedIdx: index('comments_task_created_idx').on(table.taskId, table.createdAt),
}));
