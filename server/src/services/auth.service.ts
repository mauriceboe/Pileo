import { eq, and, gt } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { db } from '../config/database.js';
import { users, passwordResetTokens } from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import { generateToken, hashToken } from '../utils/crypto.js';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@pileo/shared';
import type { RegisterInput, LoginInput, UserPublic } from '@pileo/shared';
import {
  MAX_FAILED_LOGIN_ATTEMPTS,
  ACCOUNT_LOCKOUT_DURATION_MS,
  PASSWORD_RESET_TOKEN_EXPIRY_MS,
} from '@pileo/shared';
import type { Request } from 'express';

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

export async function register(
  data: RegisterInput,
  req: Request,
): Promise<UserPublic> {
  const validated = registerSchema.parse(data);

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
    })
    .returning();

  const user = inserted[0]!;
  const publicUser = stripPasswordHash(user);

  const session = req.session as unknown as Record<string, unknown>;
  session.userId = user.id;
  session.user = publicUser;

  logger.info({ userId: user.id }, 'User registered');
  return publicUser;
}

export async function login(
  data: LoginInput,
  req: Request,
): Promise<UserPublic> {
  const validated = loginSchema.parse(data);

  const found = await db
    .select()
    .from(users)
    .where(eq(users.email, validated.email))
    .limit(1);

  const user = found[0];

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Account lockout: track failed attempts via session store
  const session = req.session as unknown as Record<string, unknown>;
  const failedAttempts = (session.failedLoginAttempts as number | undefined) ?? 0;
  const lockoutUntil = session.lockoutUntil as number | undefined;

  if (lockoutUntil && Date.now() < lockoutUntil) {
    const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
    throw new UnauthorizedError(
      `Account temporarily locked. Try again in ${remainingSeconds} seconds`,
    );
  }

  if (lockoutUntil && Date.now() >= lockoutUntil) {
    session.failedLoginAttempts = 0;
    session.lockoutUntil = undefined;
  }

  const isValidPassword = await argon2.verify(user.passwordHash, validated.password);

  if (!isValidPassword) {
    const newFailedAttempts = failedAttempts + 1;
    session.failedLoginAttempts = newFailedAttempts;

    if (newFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      session.lockoutUntil = Date.now() + ACCOUNT_LOCKOUT_DURATION_MS;
      session.failedLoginAttempts = 0;
      logger.warn({ email: validated.email }, 'Account locked due to too many failed login attempts');
      throw new UnauthorizedError('Too many failed login attempts. Account temporarily locked for 15 minutes');
    }

    throw new UnauthorizedError('Invalid email or password');
  }

  // Successful login: reset failed attempts
  session.failedLoginAttempts = 0;
  session.lockoutUntil = undefined;

  await db
    .update(users)
    .set({ lastLoginAt: new Date().toISOString() })
    .where(eq(users.id, user.id));

  const publicUser = stripPasswordHash({ ...user, lastLoginAt: new Date().toISOString() });
  session.userId = user.id;
  session.user = publicUser;

  logger.info({ userId: user.id }, 'User logged in');
  return publicUser;
}

export async function logout(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        logger.error({ err }, 'Failed to destroy session');
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export async function forgotPassword(email: string): Promise<void> {
  const validated = forgotPasswordSchema.parse({ email });

  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, validated.email))
    .limit(1);

  // Always return success to prevent email enumeration
  if (found.length === 0) {
    logger.info({ email: validated.email }, 'Password reset requested for non-existent email');
    return;
  }

  const userId = found[0]!.id;

  // Delete any existing tokens for this user
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId));

  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS).toISOString();

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  // In production, send email with reset link containing the raw token.
  // For now, log it (only in development).
  logger.info({ userId, token }, 'Password reset token generated');
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const validated = resetPasswordSchema.parse({ token, password: newPassword });

  const tokenHash = hashToken(validated.token);

  const found = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, new Date().toISOString()),
      ),
    )
    .limit(1);

  const resetToken = found[0];

  if (!resetToken) {
    throw new ValidationError('Invalid or expired reset token');
  }

  const passwordHash = await argon2.hash(validated.password, ARGON2_OPTIONS);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date().toISOString() })
    .where(eq(users.id, resetToken.userId));

  // Single-use: delete the token after use
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.id, resetToken.id));

  logger.info({ userId: resetToken.userId }, 'Password reset completed');
}

export async function getCurrentUser(userId: string): Promise<UserPublic> {
  const found = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = found[0];

  if (!user) {
    throw new NotFoundError('User', userId);
  }

  return stripPasswordHash(user);
}
