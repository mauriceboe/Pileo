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

// Accepts `Bearer pil_…` (personal API key) or `Bearer pioa_…` (OAuth
// access token, audience-bound to this endpoint per RFC 8707).
// Session cookies are not accepted — MCP clients are headless and we
// don't want browser CSRF reaching tool calls.
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
    if (resolved.audience !== expectedAudience(req)) return null;
    return {
      userId: resolved.userId,
      projectId: '',
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
