import { eq } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { db } from '../config/database.js';
import { users } from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../utils/errors.js';
import { adminCreateUserSchema, adminUpdateRoleSchema } from '@pileo/shared';
import type { UserPublic, AdminCreateUserInput, AdminUpdateRoleInput } from '@pileo/shared';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

function stripPasswordHash(user: typeof users.$inferSelect): UserPublic {
  const { passwordHash: _hash, emailVerified: _ev, ...publicUser } = user;
  return publicUser;
}

export async function listUsers(): Promise<UserPublic[]> {
  const rows = await db.select().from(users);
  return rows.map(stripPasswordHash);
}

export async function createUser(data: AdminCreateUserInput): Promise<UserPublic> {
  const validated = adminCreateUserSchema.parse(data);

  const existingByEmail = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, validated.email))
    .limit(1);

  if (existingByEmail.length > 0) {
    throw new ConflictError('A user with this email already exists');
  }

  const existingByUsername = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, validated.username))
    .limit(1);

  if (existingByUsername.length > 0) {
    throw new ConflictError('A user with this username already exists');
  }

  const passwordHash = await argon2.hash(validated.password, ARGON2_OPTIONS);

  const inserted = await db
    .insert(users)
    .values({
      email: validated.email,
      username: validated.username,
      displayName: validated.displayName,
      passwordHash,
      role: validated.role,
    })
    .returning();

  const user = inserted[0]!;
  logger.info({ userId: user.id, createdByAdmin: true }, 'User created by admin');
  return stripPasswordHash(user);
}

export async function deleteUser(targetUserId: string, adminUserId: string): Promise<void> {
  if (targetUserId === adminUserId) {
    throw new ForbiddenError('You cannot delete your own account through admin panel');
  }

  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (found.length === 0) {
    throw new NotFoundError('User', targetUserId);
  }

  await db.delete(users).where(eq(users.id, targetUserId));
  logger.info({ targetUserId, adminUserId }, 'User deleted by admin');
}

export async function updateRole(
  targetUserId: string,
  adminUserId: string,
  data: AdminUpdateRoleInput,
): Promise<UserPublic> {
  const validated = adminUpdateRoleSchema.parse(data);

  if (targetUserId === adminUserId) {
    throw new ForbiddenError('You cannot change your own role');
  }

  const updated = await db
    .update(users)
    .set({ role: validated.role, updatedAt: new Date().toISOString() })
    .where(eq(users.id, targetUserId))
    .returning();

  const user = updated[0];

  if (!user) {
    throw new NotFoundError('User', targetUserId);
  }

  logger.info({ targetUserId, adminUserId, newRole: validated.role }, 'User role updated by admin');
  return stripPasswordHash(user);
}
