import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as oauthService from '../services/oauth.service.js';

// OAuth 2.1 endpoints. These live in the legacy Express stack (not Nest)
// because they are not part of the strangler-fig migration — they are a
// fresh feature on the same wire shape as the rest of /api/v1.

const router = Router();

// Public discovery — anyone can read.
router.get('/discovery/authorization-server', (req: Request, res: Response) => {
  const base = pickBaseUrl(req);
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/api/v1/oauth/authorize`,
    token_endpoint: `${base}/api/v1/oauth/token`,
    revocation_endpoint: `${base}/api/v1/oauth/revoke`,
    registration_endpoint: `${base}/api/v1/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    scopes_supported: ['mcp.read', 'mcp.write'],
  });
});

router.get('/discovery/protected-resource', (req: Request, res: Response) => {
  const base = pickBaseUrl(req);
  res.json({
    resource: `${base}/api/v1/mcp`,
    authorization_servers: [base],
    scopes_supported: ['mcp.read', 'mcp.write'],
    bearer_methods_supported: ['header'],
  });
});

// Dynamic Client Registration (RFC 7591). Requires an existing Pileo
// session — we don't allow anonymous client registration today so the
// owner is always identifiable.
const registerSchema = z.object({
  client_name: z.string().min(1).max(100),
  redirect_uris: z.array(z.string().url()).min(1),
  token_endpoint_auth_method: z.enum(['none', 'client_secret_post']).default('none'),
});
router.post('/register', authenticate, validate(registerSchema), async (req: Request, res: Response) => {
  const body = (req as Request & { validatedBody: z.infer<typeof registerSchema> }).validatedBody;
  const userId = (req as AuthenticatedRequest).user.id;
  const client = await oauthService.registerClient(
    {
      name: body.client_name,
      redirectUris: body.redirect_uris,
      isPublic: body.token_endpoint_auth_method === 'none',
    },
    userId,
  );
  res.status(201).json({
    client_id: client.id,
    client_secret: client.clientSecret,
    client_id_issued_at: Math.floor(new Date(client.createdAt).getTime() / 1000),
    client_name: client.name,
    redirect_uris: client.redirectUris,
    token_endpoint_auth_method: client.isPublic ? 'none' : 'client_secret_post',
  });
});

// Owner-only client management (powers the Pileo settings UI).
router.get('/clients', authenticate, (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user.id;
  res.json({ data: oauthService.listClients(userId) });
});

router.delete('/clients/:clientId', authenticate, (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user.id;
  oauthService.revokeClient(req.params['clientId']!, userId);
  res.status(204).send();
});

// Authorization endpoint — GET renders a consent page, POST issues the
// code. The session cookie identifies the user; if they aren't logged in
// we bounce to the Pileo login page with a return URL.
router.get('/authorize', (req: Request, res: Response) => {
  const params = parseAuthorizeQuery(req);
  if ('error' in params) {
    renderError(res, params.error, params.error_description);
    return;
  }
  const session = req.session as unknown as Record<string, unknown> | undefined;
  if (!session?.['user']) {
    const next = encodeURIComponent(req.originalUrl);
    res.redirect(`/login?next=${next}`);
    return;
  }
  const user = session['user'] as { display_name: string; username: string };
  renderConsent(res, { ...params, displayName: user.display_name, username: user.username });
});

router.post('/authorize', (req: Request, res: Response) => {
  const params = parseAuthorizeQuery(req);
  if ('error' in params) {
    renderError(res, params.error, params.error_description);
    return;
  }
  const session = req.session as unknown as Record<string, unknown> | undefined;
  const user = session?.['user'] as { id: string } | undefined;
  if (!user) {
    res.redirect('/login');
    return;
  }
  const action = String(req.body?.action ?? '');
  if (action !== 'approve') {
    const url = new URL(params.redirect_uri);
    url.searchParams.set('error', 'access_denied');
    if (params.state) url.searchParams.set('state', params.state);
    res.redirect(url.toString());
    return;
  }
  let code: string;
  try {
    code = oauthService.createAuthorizationCode({
      clientId: params.client_id,
      userId: user.id,
      redirectUri: params.redirect_uri,
      codeChallenge: params.code_challenge,
      codeChallengeMethod: 'S256',
      scopes: params.scope ? params.scope.split(' ').filter(Boolean) : [],
      audience: params.resource ?? `${pickBaseUrl(req)}/api/v1/mcp`,
    });
  } catch (err) {
    renderError(res, 'invalid_request', (err as Error).message);
    return;
  }
  const url = new URL(params.redirect_uri);
  url.searchParams.set('code', code);
  if (params.state) url.searchParams.set('state', params.state);
  res.redirect(url.toString());
});

// Token endpoint — application/x-www-form-urlencoded per OAuth spec.
router.post('/token', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const grantType = String(body['grant_type'] ?? '');
  try {
    if (grantType === 'authorization_code') {
      const tokens = await oauthService.exchangeCode({
        code: String(body['code'] ?? ''),
        clientId: String(body['client_id'] ?? ''),
        clientSecret: body['client_secret'] ? String(body['client_secret']) : null,
        redirectUri: String(body['redirect_uri'] ?? ''),
        codeVerifier: String(body['code_verifier'] ?? ''),
      });
      res.json({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: 'Bearer',
        expires_in: tokens.expiresIn,
        scope: tokens.scopes.join(' '),
      });
      return;
    }
    if (grantType === 'refresh_token') {
      const tokens = await oauthService.refreshAccessToken(
        String(body['refresh_token'] ?? ''),
        String(body['client_id'] ?? ''),
        body['client_secret'] ? String(body['client_secret']) : null,
      );
      res.json({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: 'Bearer',
        expires_in: tokens.expiresIn,
        scope: tokens.scopes.join(' '),
      });
      return;
    }
    res.status(400).json({ error: 'unsupported_grant_type' });
  } catch (err) {
    res.status(401).json({ error: 'invalid_grant', error_description: (err as Error).message });
  }
});

router.post('/revoke', (req: Request, res: Response) => {
  const token = String((req.body as Record<string, unknown>)['token'] ?? '');
  oauthService.revokeAccessToken(token);
  // RFC 7009: always 200 even when the token didn't exist.
  res.status(200).end();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickBaseUrl(req: Request): string {
  const proto = req.headers['x-forwarded-proto'] ?? req.protocol;
  const host = req.headers['x-forwarded-host'] ?? req.headers['host'];
  return `${proto}://${host}`;
}

interface AuthorizeParams {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  state?: string;
  scope?: string;
  resource?: string;
}

function parseAuthorizeQuery(req: Request): AuthorizeParams | { error: string; error_description: string } {
  const q = req.query;
  const response_type = String(q['response_type'] ?? '');
  const code_challenge_method = String(q['code_challenge_method'] ?? '');
  if (response_type !== 'code') {
    return { error: 'unsupported_response_type', error_description: 'response_type must be "code"' };
  }
  if (code_challenge_method !== 'S256') {
    return { error: 'invalid_request', error_description: 'code_challenge_method must be "S256"' };
  }
  const client_id = String(q['client_id'] ?? '');
  const redirect_uri = String(q['redirect_uri'] ?? '');
  const code_challenge = String(q['code_challenge'] ?? '');
  if (!client_id || !redirect_uri || !code_challenge) {
    return { error: 'invalid_request', error_description: 'client_id, redirect_uri and code_challenge are required' };
  }
  const client = oauthService.getClient(client_id);
  if (!client) return { error: 'invalid_request', error_description: 'unknown client_id' };
  if (!client.redirectUris.includes(redirect_uri)) {
    return { error: 'invalid_request', error_description: 'redirect_uri not registered for this client' };
  }
  return {
    client_id,
    redirect_uri,
    code_challenge,
    state: q['state'] ? String(q['state']) : undefined,
    scope: q['scope'] ? String(q['scope']) : undefined,
    resource: q['resource'] ? String(q['resource']) : undefined,
  };
}

// HTML rendering — kept inline + minimal. The settings UI is the rich
// surface; the consent page is just a security checkpoint.
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function renderConsent(res: Response, ctx: AuthorizeParams & { displayName: string; username: string }): void {
  const client = oauthService.getClient(ctx.client_id)!;
  const scopes = ctx.scope ? ctx.scope.split(' ').filter(Boolean) : ['mcp.read', 'mcp.write'];
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Authorize ${escapeHtml(client.name)} · Pileo</title>
<style>
  :root { color-scheme: light dark; --bg:#fff; --fg:#0f172a; --muted:#64748b; --border:#e2e8f0; --accent:#4F46E5; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0f172a; --fg:#f1f5f9; --muted:#94a3b8; --border:#1e293b; } }
  html,body { margin:0; background:var(--bg); color:var(--fg); font:14px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .wrap { max-width: 420px; margin: 8vh auto; padding: 24px; border:1px solid var(--border); border-radius: 12px; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  p { color: var(--muted); line-height: 1.5; margin: 8px 0; }
  ul { padding-left: 18px; color: var(--fg); }
  .row { display:flex; gap:8px; margin-top: 24px; }
  button { flex:1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--fg); cursor: pointer; font: inherit; }
  button.primary { background: var(--accent); color: white; border-color: transparent; }
  code { background: rgba(127,127,127,0.12); padding: 2px 5px; border-radius: 4px; font-size: 12px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Authorize <strong>${escapeHtml(client.name)}</strong></h1>
  <p>Signed in as <strong>${escapeHtml(ctx.displayName)}</strong> (@${escapeHtml(ctx.username)})</p>
  <p>This integration is requesting access to your Pileo data:</p>
  <ul>${scopes.map((s) => `<li><code>${escapeHtml(s)}</code></li>`).join('')}</ul>
  <p>It will redirect to <code>${escapeHtml(ctx.redirect_uri)}</code>.</p>
  <form method="POST" action="${escapeHtml(`/api/v1/oauth/authorize${queryStringOf(ctx)}`)}">
    <div class="row">
      <button name="action" value="deny">Cancel</button>
      <button name="action" value="approve" class="primary">Authorize</button>
    </div>
  </form>
</div>
</body>
</html>`);
}

function queryStringOf(ctx: AuthorizeParams): string {
  const params = new URLSearchParams({
    response_type: 'code',
    code_challenge_method: 'S256',
    client_id: ctx.client_id,
    redirect_uri: ctx.redirect_uri,
    code_challenge: ctx.code_challenge,
  });
  if (ctx.state) params.set('state', ctx.state);
  if (ctx.scope) params.set('scope', ctx.scope);
  if (ctx.resource) params.set('resource', ctx.resource);
  return `?${params.toString()}`;
}

function renderError(res: Response, error: string, description: string): void {
  res.status(400).type('html').send(`<!doctype html>
<html><body style="font:14px system-ui; padding: 24px; max-width: 480px;">
<h1 style="font-size:18px;">OAuth error</h1>
<p><strong>${escapeHtml(error)}</strong></p>
<p style="color:#64748b;">${escapeHtml(description)}</p>
</body></html>`);
}

export { router as oauthRoutes };
