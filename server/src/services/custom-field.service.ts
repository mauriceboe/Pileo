import { randomUUID } from 'node:crypto';
import { sqlite } from '../config/database.js';
import { logger } from '../config/logger.js';

export interface CustomField {
  id: string;
  projectId: string;
  name: string;
  type: 'dropdown' | 'checklist' | 'text_small' | 'text_large';
  options: string[] | null; // for dropdown values
  position: number;
  showOnCard: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCustomValue {
  id: string;
  taskId: string;
  fieldId: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomFieldRow {
  id: string;
  project_id: string;
  name: string;
  type: string;
  options: string | null;
  position: number;
  show_on_card: number;
  is_enabled: number;
  created_at: string;
  updated_at: string;
}

interface TaskCustomValueRow {
  id: string;
  task_id: string;
  field_id: string;
  value: string;
  created_at: string;
  updated_at: string;
}

function mapField(row: CustomFieldRow): CustomField {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    type: row.type as CustomField['type'],
    options: row.options ? JSON.parse(row.options) : null,
    position: row.position,
    showOnCard: !!row.show_on_card,
    isEnabled: !!row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapValue(row: TaskCustomValueRow): TaskCustomValue {
  return {
    id: row.id,
    taskId: row.task_id,
    fieldId: row.field_id,
    value: row.value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Custom Fields CRUD ---

export function listFields(projectId: string): CustomField[] {
  const rows = sqlite
    .prepare('SELECT * FROM custom_fields WHERE project_id = ? ORDER BY position ASC')
    .all(projectId) as CustomFieldRow[];
  return rows.map(mapField);
}

export function createField(projectId: string, data: {
  name: string;
  type: CustomField['type'];
  options?: string[];
  showOnCard?: boolean;
}): CustomField {
  const id = randomUUID();
  const now = new Date().toISOString();

  // Get next position
  const last = sqlite
    .prepare('SELECT MAX(position) as maxPos FROM custom_fields WHERE project_id = ?')
    .get(projectId) as { maxPos: number | null } | undefined;
  const position = (last?.maxPos ?? -1) + 1;

  sqlite.prepare(
    'INSERT INTO custom_fields (id, project_id, name, type, options, position, show_on_card, is_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
  ).run(
    id, projectId, data.name, data.type,
    data.options ? JSON.stringify(data.options) : null,
    position, data.showOnCard ? 1 : 0, now, now,
  );

  logger.info({ fieldId: id, projectId }, 'Custom field created');
  return listFields(projectId).find((f) => f.id === id)!;
}

export function updateField(fieldId: string, data: {
  name?: string;
  type?: CustomField['type'];
  options?: string[];
  showOnCard?: boolean;
  isEnabled?: boolean;
}): CustomField {
  const now = new Date().toISOString();
  const existing = sqlite.prepare('SELECT * FROM custom_fields WHERE id = ?').get(fieldId) as CustomFieldRow | undefined;
  if (!existing) throw new Error('Field not found');

  const name = data.name ?? existing.name;
  const type = data.type ?? existing.type;
  const options = data.options !== undefined ? JSON.stringify(data.options) : existing.options;
  const showOnCard = data.showOnCard !== undefined ? (data.showOnCard ? 1 : 0) : existing.show_on_card;
  const isEnabled = data.isEnabled !== undefined ? (data.isEnabled ? 1 : 0) : existing.is_enabled;

  sqlite.prepare(
    'UPDATE custom_fields SET name = ?, type = ?, options = ?, show_on_card = ?, is_enabled = ?, updated_at = ? WHERE id = ?',
  ).run(name, type, options, showOnCard, isEnabled, now, fieldId);

  return mapField(sqlite.prepare('SELECT * FROM custom_fields WHERE id = ?').get(fieldId) as CustomFieldRow);
}

export function deleteField(fieldId: string): void {
  sqlite.prepare('DELETE FROM custom_fields WHERE id = ?').run(fieldId);
  logger.info({ fieldId }, 'Custom field deleted');
}

export function reorderFields(projectId: string, fieldIds: string[]): void {
  const stmt = sqlite.prepare('UPDATE custom_fields SET position = ?, updated_at = ? WHERE id = ? AND project_id = ?');
  const now = new Date().toISOString();
  for (let i = 0; i < fieldIds.length; i++) {
    stmt.run(i, now, fieldIds[i], projectId);
  }
}

// --- Task Custom Values ---

export function getTaskValues(taskId: string): TaskCustomValue[] {
  const rows = sqlite
    .prepare('SELECT * FROM task_custom_values WHERE task_id = ?')
    .all(taskId) as TaskCustomValueRow[];
  return rows.map(mapValue);
}

export function getTasksValues(taskIds: string[]): Map<string, TaskCustomValue[]> {
  if (taskIds.length === 0) return new Map();
  const placeholders = taskIds.map(() => '?').join(',');
  const rows = sqlite
    .prepare(`SELECT * FROM task_custom_values WHERE task_id IN (${placeholders})`)
    .all(...taskIds) as TaskCustomValueRow[];

  const result = new Map<string, TaskCustomValue[]>();
  for (const row of rows) {
    const mapped = mapValue(row);
    const list = result.get(mapped.taskId) ?? [];
    list.push(mapped);
    result.set(mapped.taskId, list);
  }
  return result;
}

export function setTaskValue(taskId: string, fieldId: string, value: string): TaskCustomValue {
  const now = new Date().toISOString();
  const existing = sqlite
    .prepare('SELECT id FROM task_custom_values WHERE task_id = ? AND field_id = ?')
    .get(taskId, fieldId) as { id: string } | undefined;

  if (existing) {
    sqlite.prepare('UPDATE task_custom_values SET value = ?, updated_at = ? WHERE id = ?').run(value, now, existing.id);
    return mapValue(sqlite.prepare('SELECT * FROM task_custom_values WHERE id = ?').get(existing.id) as TaskCustomValueRow);
  }

  const id = randomUUID();
  sqlite.prepare(
    'INSERT INTO task_custom_values (id, task_id, field_id, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, taskId, fieldId, value, now, now);
  return mapValue(sqlite.prepare('SELECT * FROM task_custom_values WHERE id = ?').get(id) as TaskCustomValueRow);
}

export function deleteTaskValue(taskId: string, fieldId: string): void {
  sqlite.prepare('DELETE FROM task_custom_values WHERE task_id = ? AND field_id = ?').run(taskId, fieldId);
}
