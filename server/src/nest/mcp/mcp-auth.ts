import type { Request } from 'express';
import * as apiKeyService from '../../services/api-key.service.js';

export interface McpAuthResult {
  userId: string;
  projectId: string;
}

// MCP authentication: only Bearer API keys (pil_…) are accepted today.
// Session cookies are deliberately NOT honoured here — MCP clients are
// always headless integrations, not browser sessions, and we want a clear
// audit trail per API key. OAuth 2.1 tokens land in a follow-up commit (M2).
//
// Returns null on any failure so the caller can decide the correct HTTP
// status (the MCP spec asks for 401 with a WWW-Authenticate challenge).
export async function authenticateMcpRequest(req: Request): Promise<McpAuthResult | null> {
  const header = req.headers['authorization'];
  if (!header || typeof header !== 'string') return null;
  const spaceIdx = header.indexOf(' ');
  if (spaceIdx === -1) return null;
  const scheme = header.slice(0, spaceIdx).toLowerCase();
  const token = header.slice(spaceIdx + 1).trim();
  if (scheme !== 'bearer' || !token) return null;

  const result = await apiKeyService.resolve(token);
  if (!result) return null;
  return { userId: result.userId, projectId: result.projectId };
}
