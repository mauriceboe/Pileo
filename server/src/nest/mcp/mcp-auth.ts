import type { Request } from 'express';
import * as apiKeyService from '../../services/api-key.service.js';
import * as oauthService from '../../services/oauth.service.js';

export type McpAuthMethod = 'api_key' | 'oauth';

export interface McpAuthResult {
  userId: string;
  projectId: string;
  /** OAuth scopes; empty for personal API keys (which carry no scope concept). */
  scopes: string[];
  method: McpAuthMethod;
}

// MCP authentication accepts two token types:
//   1. Personal API keys (Bearer pil_…)   — for the owner's own scripts / Claude Code.
//   2. OAuth 2.1 access tokens (Bearer pioa_…) — for third-party connectors
//      (claude.ai). These are audience-bound to this exact endpoint.
//
// Session cookies are deliberately NOT honoured here: MCP clients are always
// headless, and accepting cookies would let a CSRF-style attack invoke MCP
// tools from a browser context.
export async function authenticateMcpRequest(req: Request): Promise<McpAuthResult | null> {
  const header = req.headers['authorization'];
  if (!header || typeof header !== 'string') return null;
  const spaceIdx = header.indexOf(' ');
  if (spaceIdx === -1) return null;
  const scheme = header.slice(0, spaceIdx).toLowerCase();
  const token = header.slice(spaceIdx + 1).trim();
  if (scheme !== 'bearer' || !token) return null;

  if (token.startsWith(oauthService.TOKEN_PREFIXES.access)) {
    const resolved = oauthService.resolveAccessToken(token);
    if (!resolved) return null;
    // Audience-binding (RFC 8707): the token was minted for this exact
    // resource URL. Anything else means token reuse across resources →
    // reject loudly.
    const expected = expectedAudience(req);
    if (resolved.audience !== expected) return null;
    return {
      userId: resolved.userId,
      projectId: '', // OAuth tokens are user-scoped, not project-scoped.
      scopes: resolved.scopes,
      method: 'oauth',
    };
  }

  const apiKey = await apiKeyService.resolve(token);
  if (!apiKey) return null;
  return {
    userId: apiKey.userId,
    projectId: apiKey.projectId,
    scopes: [],
    method: 'api_key',
  };
}

function expectedAudience(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? req.protocol;
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers['host'];
  // The MCP endpoint path is fixed by the controller mount.
  return `${proto}://${host}/api/v1/mcp`;
}
