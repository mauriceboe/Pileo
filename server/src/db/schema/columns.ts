import { randomUUID } from 'node:crypto';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { boards } from './boards.js';

export const columns = sqliteTable('columns', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  boardId: text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#4A90D9'),
  icon: text('icon'),
  position: integer('position').notNull().default(0),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  taskLimit: integer('task_limit'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  boardPositionIdx: index('columns_board_position_idx').on(table.boardId, table.position),
}));
