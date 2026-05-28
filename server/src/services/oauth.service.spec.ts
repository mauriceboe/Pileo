import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHash } from 'node:crypto';

// vi.mock is hoisted, so we have to construct the in-memory DB inside the
// factory and re-export it. The whole spec file shares one connection.
vi.mock('../config/database.js', async () => {
  const { default: Database } = await import('better-sqlite3');
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return { sqlite: db, db: undefined };
});

import { sqlite as memDb } from '../config/database.js';
import * as oauth from './oauth.service.js';
import { UnauthorizedError, ValidationError } from '../utils/errors.js';

function initSchema() {
  memDb.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE oauth_clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_secret_hash TEXT,
      redirect_uris TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 1,
      created_by TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE oauth_codes (
      code TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      redirect_uri TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      code_challenge_method TEXT NOT NULL DEFAULT 'S256',
      scopes TEXT NOT NULL,
      audience TEXT,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE oauth_access_tokens (
      token_hash TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scopes TEXT NOT NULL,
      audience TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      refresh_token_hash TEXT UNIQUE,
      refresh_expires_at TEXT,
      revoked_at TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

function seedUser(id = 'user-1'): string {
  memDb
    .prepare(`INSERT OR IGNORE INTO users VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, `${id}@x`, id, id, 'h', '2026-01-01', '2026-01-01');
  return id;
}

// PKCE helper for the tests.
function pkceFromVerifier(verifier: string): string {
  return createHash('sha256').update(verifier, 'utf8').digest('base64url');
}

beforeEach(() => {
  memDb.exec(`
    DELETE FROM oauth_access_tokens;
    DELETE FROM oauth_codes;
    DELETE FROM oauth_clients;
    DELETE FROM users;
  `);
});

// First test sets up schema (idempotent — IF NOT EXISTS would also work
// but it's fine to lazy-init once).
initSchema();

const USER = 'user-1';
const AUDIENCE = 'https://example.com/api/v1/mcp';

describe('oauth.service — client registration', () => {
  it('creates a public client without a secret', async () => {
    seedUser(USER);
    const c = await oauth.registerClient(
      { name: 'claude.ai', redirectUris: ['https://claude.ai/cb'], isPublic: true },
      USER,
    );
    expect(c.id).toBeTruthy();
    expect(c.clientSecret).toBeNull();
    expect(c.isPublic).toBe(true);
    expect(c.redirectUris).toEqual(['https://claude.ai/cb']);
  });

  it('creates a confidential client and returns the plaintext secret exactly once', async () => {
    seedUser(USER);
    const c = await oauth.registerClient(
      { name: 'integration', redirectUris: ['https://example.com/cb'], isPublic: false },
      USER,
    );
    expect(c.clientSecret).toMatch(/^pios_/);
    // Stored row must NOT contain the plaintext secret.
    const row = memDb.prepare(`SELECT client_secret_hash FROM oauth_clients WHERE id = ?`).get(c.id) as { client_secret_hash: string };
    expect(row.client_secret_hash).not.toBe(c.clientSecret);
    expect(row.client_secret_hash).toContain('$argon2');
  });

  it('rejects an empty name and a too-long name', async () => {
    seedUser(USER);
    await expect(oauth.registerClient({ name: '', redirectUris: ['https://x.test/cb'], isPublic: true }, USER)).rejects.toBeInstanceOf(ValidationError);
    await expect(oauth.registerClient({ name: 'x'.repeat(101), redirectUris: ['https://x.test/cb'], isPublic: true }, USER)).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects http redirect_uris that are not loopback', async () => {
    seedUser(USER);
    await expect(oauth.registerClient({ name: 'n', redirectUris: ['http://evil.test/cb'], isPublic: true }, USER)).rejects.toBeInstanceOf(ValidationError);
    // Loopback is allowed (RFC 8252).
    const c = await oauth.registerClient({ name: 'n', redirectUris: ['http://localhost:4000/cb'], isPublic: true }, USER);
    expect(c.id).toBeTruthy();
  });

  it('rejects redirect_uris containing fragments', async () => {
    seedUser(USER);
    await expect(oauth.registerClient({ name: 'n', redirectUris: ['https://x.test/cb#frag'], isPublic: true }, USER)).rejects.toBeInstanceOf(ValidationError);
  });

  it('listClients returns the owner\'s clients in newest-first order', async () => {
    seedUser(USER);
    await oauth.registerClient({ name: 'first', redirectUris: ['https://x.test/a'], isPublic: true }, USER);
    await new Promise((r) => setTimeout(r, 5));
    await oauth.registerClient({ name: 'second', redirectUris: ['https://x.test/b'], isPublic: true }, USER);
    const list = oauth.listClients(USER);
    expect(list.map((c) => c.name)).toEqual(['second', 'first']);
  });

  it('accepts userId=null for anonymous Dynamic Client Registration', async () => {
    // No user is seeded — the client must persist with NULL created_by.
    const c = await oauth.registerClient(
      { name: 'claude.ai', redirectUris: ['https://claude.ai/cb'], isPublic: true },
      null,
    );
    expect(c.id).toBeTruthy();
    const row = memDb.prepare(`SELECT created_by FROM oauth_clients WHERE id = ?`).get(c.id) as { created_by: string | null };
    expect(row.created_by).toBeNull();
  });

  it('claims an anonymous client when a user first approves', async () => {
    const c = await oauth.registerClient(
      { name: 'claude', redirectUris: ['https://claude.ai/cb'], isPublic: true },
      null,
    );
    seedUser(USER);
    oauth.createAuthorizationCode({
      clientId: c.id,
      userId: USER,
      redirectUri: 'https://claude.ai/cb',
      codeChallenge: 'x'.repeat(43),
      codeChallengeMethod: 'S256',
      scopes: [],
      audience: AUDIENCE,
    });
    const row = memDb.prepare(`SELECT created_by FROM oauth_clients WHERE id = ?`).get(c.id) as { created_by: string };
    expect(row.created_by).toBe(USER);
  });

  it('does not re-claim a client that already has an owner', async () => {
    seedUser(USER);
    seedUser('other');
    const c = await oauth.registerClient(
      { name: 'owned', redirectUris: ['https://x.test/cb'], isPublic: true },
      USER,
    );
    // A different user approving must not overwrite the original owner.
    oauth.createAuthorizationCode({
      clientId: c.id,
      userId: 'other',
      redirectUri: 'https://x.test/cb',
      codeChallenge: 'x'.repeat(43),
      codeChallengeMethod: 'S256',
      scopes: [],
      audience: AUDIENCE,
    });
    const row = memDb.prepare(`SELECT created_by FROM oauth_clients WHERE id = ?`).get(c.id) as { created_by: string };
    expect(row.created_by).toBe(USER);
  });

  it('revokeClient only allows the owner', async () => {
    seedUser(USER);
    seedUser('other-user');
    const c = await oauth.registerClient({ name: 'n', redirectUris: ['https://x.test/cb'], isPublic: true }, USER);
    expect(() => oauth.revokeClient(c.id, 'other-user')).toThrow(UnauthorizedError);
    oauth.revokeClient(c.id, USER);
    expect(oauth.getClient(c.id)).toBeNull();
  });
});

describe('oauth.service — authorization code + token exchange', () => {
  const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  const CHALLENGE = pkceFromVerifier(VERIFIER);

  it('round-trips: register → code → exchange → resolve', async () => {
    seedUser(USER);
    const client = await oauth.registerClient(
      { name: 'claude', redirectUris: ['https://claude.ai/cb'], isPublic: true },
      USER,
    );
    const code = oauth.createAuthorizationCode({
      clientId: client.id,
      userId: USER,
      redirectUri: 'https://claude.ai/cb',
      codeChallenge: CHALLENGE,
      codeChallengeMethod: 'S256',
      scopes: ['mcp.read'],
      audience: AUDIENCE,
    });
    expect(code).toMatch(/^pioc_/);

    const tokens = await oauth.exchangeCode({
      code,
      clientId: client.id,
      clientSecret: null,
      redirectUri: 'https://claude.ai/cb',
      codeVerifier: VERIFIER,
    });
    expect(tokens.accessToken).toMatch(/^pioa_/);
    expect(tokens.refreshToken).toMatch(/^pior_/);
    expect(tokens.scopes).toEqual(['mcp.read']);
    expect(tokens.audience).toBe(AUDIENCE);

    const resolved = oauth.resolveAccessToken(tokens.accessToken);
    expect(resolved).toEqual({ userId: USER, clientId: client.id, scopes: ['mcp.read'], audience: AUDIENCE });
  });

  it('rejects a code reused (single-use enforcement)', async () => {
    seedUser(USER);
    const client = await oauth.registerClient({ name: 'n', redirectUris: ['https://x.test/cb'], isPublic: true }, USER);
    const code = oauth.createAuthorizationCode({
      clientId: client.id, userId: USER, redirectUri: 'https://x.test/cb',
      codeChallenge: CHALLENGE, codeChallengeMethod: 'S256', scopes: [], audience: AUDIENCE,
    });
    await oauth.exchangeCode({ code, clientId: client.id, clientSecret: null, redirectUri: 'https://x.test/cb', codeVerifier: VERIFIER });
    await expect(
      oauth.exchangeCode({ code, clientId: client.id, clientSecret: null, redirectUri: 'https://x.test/cb', codeVerifier: VERIFIER }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects wrong PKCE verifier', async () => {
    seedUser(USER);
    const client = await oauth.registerClient({ name: 'n', redirectUris: ['https://x.test/cb'], isPublic: true }, USER);
    const code = oauth.createAuthorizationCode({
      clientId: client.id, userId: USER, redirectUri: 'https://x.test/cb',
      codeChallenge: CHALLENGE, codeChallengeMethod: 'S256', scopes: [], audience: AUDIENCE,
    });
    await expect(
      oauth.exchangeCode({ code, clientId: client.id, clientSecret: null, redirectUri: 'https://x.test/cb', codeVerifier: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects redirect_uri mismatch between authorize and token steps', async () => {
    seedUser(USER);
    const client = await oauth.registerClient({ name: 'n', redirectUris: ['https://x.test/a', 'https://x.test/b'], isPublic: true }, USER);
    const code = oauth.createAuthorizationCode({
      clientId: client.id, userId: USER, redirectUri: 'https://x.test/a',
      codeChallenge: CHALLENGE, codeChallengeMethod: 'S256', scopes: [], audience: AUDIENCE,
    });
    await expect(
      oauth.exchangeCode({ code, clientId: client.id, clientSecret: null, redirectUri: 'https://x.test/b', codeVerifier: VERIFIER }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects redirect_uri not registered for the client', () => {
    seedUser(USER);
    return oauth.registerClient({ name: 'n', redirectUris: ['https://x.test/cb'], isPublic: true }, USER).then((client) => {
      expect(() => oauth.createAuthorizationCode({
        clientId: client.id, userId: USER, redirectUri: 'https://attacker.test/cb',
        codeChallenge: CHALLENGE, codeChallengeMethod: 'S256', scopes: [], audience: AUDIENCE,
      })).toThrow(ValidationError);
    });
  });

  it('public client must not present a secret', async () => {
    seedUser(USER);
    const client = await oauth.registerClient({ name: 'n', redirectUris: ['https://x.test/cb'], isPublic: true }, USER);
    const code = oauth.createAuthorizationCode({
      clientId: client.id, userId: USER, redirectUri: 'https://x.test/cb',
      codeChallenge: CHALLENGE, codeChallengeMethod: 'S256', scopes: [], audience: AUDIENCE,
    });
    await expect(
      oauth.exchangeCode({ code, clientId: client.id, clientSecret: 'shouldnt-have-one', redirectUri: 'https://x.test/cb', codeVerifier: VERIFIER }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('confidential client requires a valid secret', async () => {
    seedUser(USER);
    const client = await oauth.registerClient({ name: 'n', redirectUris: ['https://x.test/cb'], isPublic: false }, USER);
    const code = oauth.createAuthorizationCode({
      clientId: client.id, userId: USER, redirectUri: 'https://x.test/cb',
      codeChallenge: CHALLENGE, codeChallengeMethod: 'S256', scopes: [], audience: AUDIENCE,
    });
    await expect(
      oauth.exchangeCode({ code, clientId: client.id, clientSecret: null, redirectUri: 'https://x.test/cb', codeVerifier: VERIFIER }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      oauth.exchangeCode({ code, clientId: client.id, clientSecret: 'wrong', redirectUri: 'https://x.test/cb', codeVerifier: VERIFIER }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('oauth.service — refresh + revoke + resolve', () => {
  const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  const CHALLENGE = pkceFromVerifier(VERIFIER);

  async function setupTokens() {
    seedUser(USER);
    const client = await oauth.registerClient({ name: 'n', redirectUris: ['https://x.test/cb'], isPublic: true }, USER);
    const code = oauth.createAuthorizationCode({
      clientId: client.id, userId: USER, redirectUri: 'https://x.test/cb',
      codeChallenge: CHALLENGE, codeChallengeMethod: 'S256', scopes: ['mcp.read'], audience: AUDIENCE,
    });
    const t = await oauth.exchangeCode({ code, clientId: client.id, clientSecret: null, redirectUri: 'https://x.test/cb', codeVerifier: VERIFIER });
    return { client, tokens: t };
  }

  it('rotates tokens on refresh (old access token becomes unusable)', async () => {
    const { client, tokens } = await setupTokens();
    const newTokens = await oauth.refreshAccessToken(tokens.refreshToken, client.id, null);
    expect(newTokens.accessToken).not.toBe(tokens.accessToken);
    expect(oauth.resolveAccessToken(tokens.accessToken)).toBeNull();
    expect(oauth.resolveAccessToken(newTokens.accessToken)).not.toBeNull();
  });

  it('rejects refresh from a different client', async () => {
    const { tokens } = await setupTokens();
    seedUser('eve');
    const evil = await oauth.registerClient({ name: 'evil', redirectUris: ['https://evil.test/cb'], isPublic: true }, 'eve');
    await expect(oauth.refreshAccessToken(tokens.refreshToken, evil.id, null)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('revokeAccessToken renders the access token unusable', async () => {
    const { tokens } = await setupTokens();
    oauth.revokeAccessToken(tokens.accessToken);
    expect(oauth.resolveAccessToken(tokens.accessToken)).toBeNull();
  });

  it('revokeAccessToken via refresh token also kills the access token', async () => {
    const { tokens } = await setupTokens();
    oauth.revokeAccessToken(tokens.refreshToken);
    expect(oauth.resolveAccessToken(tokens.accessToken)).toBeNull();
  });

  it('revokeAccessToken is silently ignored for unknown prefixes (RFC 7009 §2.2)', () => {
    expect(() => oauth.revokeAccessToken('not-a-real-token')).not.toThrow();
  });

  it('resolveAccessToken returns null for unknown or wrong-prefix tokens', () => {
    expect(oauth.resolveAccessToken('totally-fake')).toBeNull();
    expect(oauth.resolveAccessToken('pioa_invalid')).toBeNull();
  });
});
