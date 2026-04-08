import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { labels } from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import { NotFoundError } from '../utils/errors.js';
import { getMemberRole, requireRole } from './project.service.js';
import type { CreateLabelInput, UpdateLabelInput } from '@pileo/shared';

type LabelRow = typeof labels.$inferSelect;

export async function list(projectId: string, userId: string): Promise<LabelRow[]> {
  const role = await getMemberRole(projectId, userId);
  if (!role) {
    throw new NotFoundError('Project', projectId);
  }

  return db
    .select()
    .from(labels)
    .where(eq(labels.projectId, projectId));
}

export async function create(
  projectId: string,
  userId: string,
  data: CreateLabelInput,
): Promise<LabelRow> {
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  const inserted = await db
    .insert(labels)
    .values({
      projectId,
      name: data.name,
      color: data.color,
    })
    .returning();

  const label = inserted[0]!;
  logger.info({ labelId: label.id, projectId, userId }, 'Label created');
  return label;
}

export async function update(
  labelId: string,
  userId: string,
  data: UpdateLabelInput,
): Promise<LabelRow> {
  // Find label and verify project access
  const rows = await db
    .select()
    .from(labels)
    .where(eq(labels.id, labelId))
    .limit(1);

  const label = rows[0];
  if (!label) {
    throw new NotFoundError('Label', labelId);
  }

  const role = await getMemberRole(label.projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  const updated = await db
    .update(labels)
    .set(data)
    .where(eq(labels.id, labelId))
    .returning();

  const result = updated[0];
  if (!result) {
    throw new NotFoundError('Label', labelId);
  }

  logger.info({ labelId, userId }, 'Label updated');
  return result;
}

export async function remove(labelId: string, userId: string): Promise<void> {
  const rows = await db
    .select()
    .from(labels)
    .where(eq(labels.id, labelId))
    .limit(1);

  const label = rows[0];
  if (!label) {
    throw new NotFoundError('Label', labelId);
  }

  const role = await getMemberRole(label.projectId, userId);
  requireRole(role, ['owner', 'admin']);

  await db.delete(labels).where(eq(labels.id, labelId));
  logger.info({ labelId, projectId: label.projectId, userId }, 'Label deleted');
}
