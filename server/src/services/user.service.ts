import { eq } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { db } from '../config/database.js';
import { users } from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import {
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../utils/errors.js';
import { updateUserSchema, changePasswordSchema } from '@pileo/shared';
import type { UserPublic, UpdateUserInput, ChangePasswordInput } from '@pileo/shared';

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

export async function getById(id: string): Promise<UserPublic> {
  const found = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  const user = found[0];

  if (!user) {
    throw new NotFoundError('User', id);
  }

  return stripPasswordHash(user);
}

export async function updateProfile(
  id: string,
  data: UpdateUserInput,
): Promise<UserPublic> {
  const validated = updateUserSchema.parse(data);

  if (validated.email) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, validated.email))
      .limit(1);

    if (existing.length > 0 && existing[0]!.id !== id) {
      throw new ConflictError('A user with this email already exists');
    }
  }

  if (validated.username) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, validated.username))
      .limit(1);

    if (existing.length > 0 && existing[0]!.id !== id) {
      throw new ConflictError('A user with this username already exists');
    }
  }

  const updated = await db
    .update(users)
    .set({ ...validated, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id))
    .returning();

  const user = updated[0];

  if (!user) {
    throw new NotFoundError('User', id);
  }

  logger.info({ userId: id }, 'User profile updated');
  return stripPasswordHash(user);
}

export async function changePassword(
  id: string,
  data: ChangePasswordInput,
): Promise<void> {
  const validated = changePasswordSchema.parse(data);

  const found = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  const user = found[0];

  if (!user) {
    throw new NotFoundError('User', id);
  }

  const isValid = await argon2.verify(user.passwordHash, validated.currentPassword);

  if (!isValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const newHash = await argon2.hash(validated.newPassword, ARGON2_OPTIONS);

  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id));

  logger.info({ userId: id }, 'User password changed');
}

export async function updateAvatar(id: string, filePath: string): Promise<UserPublic> {
  const updated = await db
    .update(users)
    .set({ avatarPath: filePath, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id))
    .returning();

  const user = updated[0];

  if (!user) {
    throw new NotFoundError('User', id);
  }

  logger.info({ userId: id }, 'User avatar updated');
  return stripPasswordHash(user);
}
