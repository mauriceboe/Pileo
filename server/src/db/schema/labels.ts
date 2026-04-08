import { randomUUID } from 'node:crypto';
import { sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { projects } from './projects.js';
import { tasks } from './tasks.js';

export const labels = sqliteTable('labels', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull(),
}, (table) => ({
  projectNameIdx: uniqueIndex('labels_project_name_idx').on(table.projectId, table.name),
}));

export const taskLabels = sqliteTable('task_labels', {
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  labelId: text('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
}, (table) => ({
  taskLabelIdx: uniqueIndex('task_labels_task_label_idx').on(table.taskId, table.labelId),
  taskIdx: index('task_labels_task_idx').on(table.taskId),
}));
