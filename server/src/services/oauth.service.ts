import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { sqlite } from '../config/database.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors.js';

// OAuth 2.1 + PKCE + RFC 8707 (audience-bound) tokens. Storage is SQLite
// alongside the rest of Pileo. Access + refresh tokens are stored as
// SHA-256 hashes so a DB read alone cannot impersonate a user. Client
// secrets (only for confidential clients) use argon2 — same primitive the
// rest of Pileo uses for passwords.

const CODE_TTL_MS = 10 * 60 * 1000;          // 10min — generous for a user round-trip
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;  // 1h
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ACCESS_TOKEN_PREFIX = 'pioa_';
const REFRESH_TOKEN_PREFIX = 'pior_';
const AUTH_CODE_PREFIX = 'pioc_';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function nowIso(): string {
  return new Date().toISOString();
}

function isoIn(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

function isExpired(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() <= Date.now();
}

function randomToken(prefix: string, bytes = 32): string {
  return prefix + randomBytes(bytes).toString('base64url');
}

// PKCE: verify code_verifier against the stored code_challenge (S256).
function verifyPkceS256(verifier: string, challenge: string): boolean {
  const hashed = createHash('sha256').update(verifier, 'utf8').digest('base64url');
  if (hashed.length !== challenge.length) return false;
  return timingSafeEqual(Buffer.from(hashed), Buffer.from(challenge));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OAuthClientRow {
  id: string;
  name: string;
  redirectUris: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
}

export interface OAuthClientWithSecret extends OAuthClientRow {
  /** Plain client_secret, only returned on creation. Never persisted plain. */
  clientSecret: string | null;
}

export interface RegisterClientInput {
  name: string;
  redirectUris: string[];
  isPublic: boolean;
}

export interface AuthorizationCodeInput {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  scopes: string[];
  audience: string;
}

export interface ExchangeCodeInput {
  code: string;
  clientId: string;
  clientSecret: string | null;
  redirectUri: string;
  codeVerifier: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scopes: string[];
  audience: string;
}

export interface ResolvedAccessToken {
  userId: string;
  clientId: string;
  scopes: string[];
  audience: string;
}

interface ClientRowDb {
  id: string;
  name: string;
  client_secret_hash: string | null;
  redirect_uris: string;
  is_public: number;
  created_by: string;
  created_at: string;
}

interface CodeRowDb {
  code: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scopes: string;
  audience: string | null;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

interface AccessTokenRowDb {
  token_hash: string;
  client_id: string;
  user_id: string;
  scopes: string;
  audience: string;
  expires_at: string;
  refresh_token_hash: string | null;
  refresh_expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateRedirectUri(uri: string): void {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new ValidationError(`Invalid redirect_uri: ${uri}`);
  }
  // RFC 8252: native loopback exception aside, http: is only acceptable on
  // 127.0.0.1 / localhost. Everything else must be https or a custom scheme.
  if (parsed.protocol === 'http:' && parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
    throw new ValidationError(`redirect_uri must use https (or http://localhost): ${uri}`);
  }
  if (parsed.hash) {
    throw new ValidationError(`redirect_uri must not contain a fragment: ${uri}`);
  }
}

function rowToClient(row: ClientRowDb): OAuthClientRow {
  return {
    id: row.id,
    name: row.name,
    redirectUris: JSON.parse(row.redirect_uris) as string[],
    isPublic: row.is_public === 1,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Client management
// ---------------------------------------------------------------------------

export async function registerClient(input: RegisterClientInput, userId: string | null): Promise<OAuthClientWithSecret> {
  if (!input.name || input.name.trim().length === 0) {
    throw new ValidationError('Client name is required');
  }
  if (input.name.length > 100) {
    throw new ValidationError('Client name max 100 characters');
  }
  if (!Array.isArray(input.redirectUris) || input.redirectUris.length === 0) {
    throw new ValidationError('At least one redirect_uri is required');
  }
  for (const uri of input.redirectUris) validateRedirectUri(uri);

  const id = uuidv4();
  let clientSecret: string | null = null;
  let secretHash: string | null = null;

  if (!input.isPublic) {
    clientSecret = randomToken('pios_', 32);
    secretHash = await argon2.hash(clientSecret);
  }

  sqlite
    .prepare(
      `INSERT INTO oauth_clients (id, name, client_secret_hash, redirect_uris, is_public, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.name.trim(),
      secretHash,
      JSON.stringify(input.redirectUris),
      input.isPublic ? 1 : 0,
      userId, // NULL for RFC 7591 anonymous registration; claimed on first /authorize approve
      nowIso(),
    );

  const row = sqlite.prepare(`SELECT * FROM oauth_clients WHERE id = ?`).get(id) as ClientRowDb;
  return { ...rowToClient(row), clientSecret };
}

export function listClients(userId: string): OAuthClientRow[] {
  const rows = sqlite
    .prepare(`SELECT * FROM oauth_clients WHERE created_by = ? ORDER BY created_at DESC`)
    .all(userId) as ClientRowDb[];
  return rows.map(rowToClient);
}

export function getClient(clientId: string): OAuthClientRow | null {
  const row = sqlite.prepare(`SELECT * FROM oauth_clients WHERE id = ?`).get(clientId) as ClientRowDb | undefined;
  return row ? rowToClient(row) : null;
}

export function revokeClient(clientId: string, userId: string): void {
  const row = sqlite.prepare(`SELECT created_by FROM oauth_clients WHERE id = ?`).get(clientId) as { created_by: string } | undefined;
  if (!row) throw new NotFoundError('OAuth client', clientId);
  if (row.created_by !== userId) throw new UnauthorizedError('Cannot revoke another user\'s client');
  // ON DELETE CASCADE removes codes + tokens.
  sqlite.prepare(`DELETE FROM oauth_clients WHERE id = ?`).run(clientId);
}

async function verifyClientSecret(clientId: string, presentedSecret: string | null): Promise<ClientRowDb> {
  const row = sqlite.prepare(`SELECT * FROM oauth_clients WHERE id = ?`).get(clientId) as ClientRowDb | undefined;
  if (!row) throw new UnauthorizedError('Unknown client');
  if (row.is_public === 1) {
    // Public clients authenticate solely via PKCE — no secret accepted.
    if (presentedSecret) throw new UnauthorizedError('Public client must not present a secret');
    return row;
  }
  if (!presentedSecret) throw new UnauthorizedError('Confidential client requires a client_secret');
  if (!row.client_secret_hash) throw new UnauthorizedError('Client has no secret on file');
  const ok = await argon2.verify(row.client_secret_hash, presentedSecret);
  if (!ok) throw new UnauthorizedError('Invalid client_secret');
  return row;
}

// ---------------------------------------------------------------------------
// Authorization code
// ---------------------------------------------------------------------------

export function createAuthorizationCode(input: AuthorizationCodeInput): string {
  const client = sqlite
    .prepare(`SELECT redirect_uris, created_by FROM oauth_clients WHERE id = ?`)
    .get(input.clientId) as { redirect_uris: string; created_by: string | null } | undefined;
  if (!client) throw new UnauthorizedError('Unknown client');

  const allowed = JSON.parse(client.redirect_uris) as string[];
  if (!allowed.includes(input.redirectUri)) {
    throw new ValidationError(`redirect_uri not registered for this client: ${input.redirectUri}`);
  }
  if (input.codeChallengeMethod !== 'S256') {
    throw new ValidationError('Only code_challenge_method=S256 is supported');
  }

  // Claim-on-approve: the first user who consents to an anonymously
  // registered client becomes its owner, so it shows up in their settings
  // and they can revoke it.
  if (client.created_by === null) {
    sqlite.prepare(`UPDATE oauth_clients SET created_by = ? WHERE id = ? AND created_by IS NULL`)
      .run(input.userId, input.clientId);
  }

  const code = randomToken(AUTH_CODE_PREFIX, 32);
  sqlite
    .prepare(
      `INSERT INTO oauth_codes (code, client_id, user_id, redirect_uri, code_challenge, code_challenge_method, scopes, audience, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'S256', ?, ?, ?, ?)`,
    )
    .run(
      code,
      input.clientId,
      input.userId,
      input.redirectUri,
      input.codeChallenge,
      JSON.stringify(input.scopes),
      input.audience,
      isoIn(CODE_TTL_MS),
      nowIso(),
    );
  return code;
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

export async function exchangeCode(input: ExchangeCodeInput): Promise<TokenPair> {
  const client = await verifyClientSecret(input.clientId, input.clientSecret);

  const row = sqlite.prepare(`SELECT * FROM oauth_codes WHERE code = ?`).get(input.code) as CodeRowDb | undefined;
  if (!row) throw new UnauthorizedError('Invalid authorization code');
  if (row.consumed_at) throw new UnauthorizedError('Authorization code already used');
  if (isExpired(row.expires_at)) throw new UnauthorizedError('Authorization code expired');
  if (row.client_id !== client.id) throw new UnauthorizedError('Code was issued to a different client');
  if (row.redirect_uri !== input.redirectUri) throw new UnauthorizedError('redirect_uri mismatch');
  if (!verifyPkceS256(input.codeVerifier, row.code_challenge)) {
    throw new UnauthorizedError('PKCE verification failed');
  }

  // Mark consumed (single-use).
  sqlite.prepare(`UPDATE oauth_codes SET consumed_at = ? WHERE code = ?`).run(nowIso(), row.code);

  const accessToken = randomToken(ACCESS_TOKEN_PREFIX, 32);
  const refreshToken = randomToken(REFRESH_TOKEN_PREFIX, 32);
  const scopes = JSON.parse(row.scopes) as string[];
  const audience = row.audience ?? '';

  sqlite
    .prepare(
      `INSERT INTO oauth_access_tokens (token_hash, client_id, user_id, scopes, audience, expires_at, refresh_token_hash, refresh_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      sha256(accessToken),
      client.id,
      row.user_id,
      JSON.stringify(scopes),
      audience,
      isoIn(ACCESS_TOKEN_TTL_MS),
      sha256(refreshToken),
      isoIn(REFRESH_TOKEN_TTL_MS),
      nowIso(),
    );

  return {
    accessToken,
    refreshToken,
    expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    scopes,
    audience,
  };
}

export async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string | null): Promise<TokenPair> {
  const client = await verifyClientSecret(clientId, clientSecret);

  const row = sqlite
    .prepare(`SELECT * FROM oauth_access_tokens WHERE refresh_token_hash = ?`)
    .get(sha256(refreshToken)) as AccessTokenRowDb | undefined;
  if (!row) throw new UnauthorizedError('Invalid refresh token');
  if (row.client_id !== client.id) throw new UnauthorizedError('Refresh token was issued to a different client');
  if (row.revoked_at) throw new UnauthorizedError('Refresh token revoked');
  if (isExpired(row.refresh_expires_at)) throw new UnauthorizedError('Refresh token expired');

  // Rotate: revoke the old token row and create a fresh one.
  sqlite.prepare(`UPDATE oauth_access_tokens SET revoked_at = ? WHERE token_hash = ?`).run(nowIso(), row.token_hash);

  const newAccess = randomToken(ACCESS_TOKEN_PREFIX, 32);
  const newRefresh = randomToken(REFRESH_TOKEN_PREFIX, 32);
  const scopes = JSON.parse(row.scopes) as string[];

  sqlite
    .prepare(
      `INSERT INTO oauth_access_tokens (token_hash, client_id, user_id, scopes, audience, expires_at, refresh_token_hash, refresh_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      sha256(newAccess),
      client.id,
      row.user_id,
      row.scopes,
      row.audience,
      isoIn(ACCESS_TOKEN_TTL_MS),
      sha256(newRefresh),
      isoIn(REFRESH_TOKEN_TTL_MS),
      nowIso(),
    );

  return {
    accessToken: newAccess,
    refreshToken: newRefresh,
    expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    scopes,
    audience: row.audience,
  };
}

export function resolveAccessToken(rawToken: string): ResolvedAccessToken | null {
  if (!rawToken.startsWith(ACCESS_TOKEN_PREFIX)) return null;
  const row = sqlite
    .prepare(`SELECT * FROM oauth_access_tokens WHERE token_hash = ?`)
    .get(sha256(rawToken)) as AccessTokenRowDb | undefined;
  if (!row) return null;
  if (row.revoked_at) return null;
  if (isExpired(row.expires_at)) return null;
  return {
    userId: row.user_id,
    clientId: row.client_id,
    scopes: JSON.parse(row.scopes) as string[],
    audience: row.audience,
  };
}

export function revokeAccessToken(rawToken: string): void {
  if (rawToken.startsWith(ACCESS_TOKEN_PREFIX)) {
    sqlite.prepare(`UPDATE oauth_access_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL`)
      .run(nowIso(), sha256(rawToken));
    return;
  }
  if (rawToken.startsWith(REFRESH_TOKEN_PREFIX)) {
    sqlite.prepare(`UPDATE oauth_access_tokens SET revoked_at = ? WHERE refresh_token_hash = ? AND revoked_at IS NULL`)
      .run(nowIso(), sha256(rawToken));
  }
  // Unknown prefixes are silently ignored per RFC 7009 §2.2.
}

export function pruneExpired(): { codes: number; tokens: number } {
  const now = nowIso();
  const codes = sqlite.prepare(`DELETE FROM oauth_codes WHERE expires_at < ?`).run(now);
  const tokens = sqlite
    .prepare(`DELETE FROM oauth_access_tokens WHERE refresh_expires_at IS NOT NULL AND refresh_expires_at < ?`)
    .run(now);
  return { codes: codes.changes, tokens: tokens.changes };
}

export const TOKEN_PREFIXES = {
  access: ACCESS_TOKEN_PREFIX,
  refresh: REFRESH_TOKEN_PREFIX,
  authCode: AUTH_CODE_PREFIX,
} as const;

export const TTL_MS = {
  code: CODE_TTL_MS,
  accessToken: ACCESS_TOKEN_TTL_MS,
  refreshToken: REFRESH_TOKEN_TTL_MS,
} as const;
