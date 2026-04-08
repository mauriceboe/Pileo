import { randomBytes, createHash } from 'node:crypto';

export function generateToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

export function generateRandomString(length = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i]! % chars.length];
  }
  return result;
}

export function generateSessionSecret(): string {
  return randomBytes(64).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
