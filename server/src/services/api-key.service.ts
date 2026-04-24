import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db } from '../config/database.js';
import { apiKeys } from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import { NotFoundError } from '../utils/errors.js';
import { getMemberRole, requireRole } from './project.service.js';
import { hashToken } from '../utils/crypto.js';

type ApiKeyRow = typeof apiKeys.$inferSelect;

export interface ApiKeyPublic {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

function toPublic(row: ApiKeyRow): ApiKeyPublic {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
  };
}

export async function create(
  projectId: string,
  userId: string,
  name: string,
): Promise<{ key: ApiKeyPublic; rawKey: string }> {
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner', 'admin']);

  const rawSecret = randomBytes(36).toString('base64url');
  const rawKey = `pil_${rawSecret}`;
  const keyHash = hashToken(rawKey);
  const keyPrefix = rawKey.slice(0, 12) + '...';

  const inserted = await db
    .insert(apiKeys)
    .values({
      projectId,
      userId,
      name,
      keyHash,
      keyPrefix,
    })
    .returning();

  const row = inserted[0]!;
  logger.info({ keyId: row.id, projectId, userId }, 'API key created');

  return { key: toPublic(row), rawKey };
}

export async function list(
  projectId: string,
  userId: string,
): Promise<ApiKeyPublic[]> {
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner', 'admin']);

  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.projectId, projectId));

  return rows.map(toPublic);
}

export async function revoke(
  keyId: string,
  userId: string,
): Promise<void> {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('API Key', keyId);
  }

  const role = await getMemberRole(row.projectId, userId);
  requireRole(role, ['owner', 'admin']);

  await db.delete(apiKeys).where(eq(apiKeys.id, keyId));
  logger.info({ keyId, userId }, 'API key revoked');
}

export async function resolve(
  rawKey: string,
): Promise<{ userId: string; projectId: string } | null> {
  const keyHash = hashToken(rawKey);

  const rows = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      projectId: apiKeys.projectId,
    })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  // Update last_used_at in background (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiKeys.id, row.id))
    .then(() => {})
    .catch((err) => logger.error({ err, keyId: row.id }, 'Failed to update last_used_at'));

  return { userId: row.userId, projectId: row.projectId };
}
