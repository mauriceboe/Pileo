import { randomUUID } from 'node:crypto';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { projects } from './projects.js';

export const boards = sqliteTable('boards', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  projectPositionIdx: index('boards_project_position_idx').on(table.projectId, table.position),
}));
