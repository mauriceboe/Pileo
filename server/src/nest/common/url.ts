import type { Request } from 'express';

// Origin URL behind a TLS-terminating reverse proxy. Reads X-Forwarded-Proto
// / X-Forwarded-Host first, falls back to req.protocol / Host.
export function pickBaseUrl(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? req.protocol;
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers['host'];
  return `${proto}://${host}`;
}
