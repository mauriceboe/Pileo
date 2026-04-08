import { randomUUID } from 'node:crypto';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './users.js';

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['mention', 'assignment', 'due_date', 'comment', 'task_moved'] }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  resourceType: text('resource_type', { enum: ['task', 'comment', 'project'] }).notNull(),
  resourceId: text('resource_id').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userReadCreatedIdx: index('notifications_user_read_created_idx').on(table.userId, table.isRead, table.createdAt),
}));
