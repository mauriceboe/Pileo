import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/oauth.service.js', () => ({
  registerClient: vi.fn(),
  listClients: vi.fn(),
  revokeClient: vi.fn(),
  createAuthorizationCode: vi.fn(),
  exchangeCode: vi.fn(),
  refreshAccessToken: vi.fn(),
  revokeAccessToken: vi.fn(),
  getClient: vi.fn(),
}));

import * as oauthService from '../../services/oauth.service.js';
import { OauthController } from './oauth.controller.js';

const USER = { id: 'u1' } as never;

function makeReq(overrides: Record<string, unknown> = {}): never {
  return {
    headers: { host: 'kanban.test', 'x-forwarded-proto': 'https' },
    query: {},
    body: {},
    originalUrl: '/api/v1/oauth/authorize',
    session: undefined,
    ...overrides,
  } as never;
}

function makeRes() {
  const r = {
    json: vi.fn(),
    status: vi.fn(),
    redirect: vi.fn(),
    type: vi.fn(),
    send: vi.fn(),
  };
  r.status.mockReturnValue(r as never);
  r.type.mockReturnValue(r as never);
  return r as never;
}

beforeEach(() => vi.clearAllMocks());

describe('OauthController — discovery', () => {
  const ctrl = new OauthController();

  it('authorization-server discovery returns the canonical endpoint set', () => {
    const result = ctrl.authorizationServerDiscovery(makeReq()) as Record<string, unknown>;
    expect(result['issuer']).toBe('https://kanban.test');
    expect(result['authorization_endpoint']).toBe('https://kanban.test/api/v1/oauth/authorize');
    expect(result['code_challenge_methods_supported']).toEqual(['S256']);
    expect(result['grant_types_supported']).toEqual(['authorization_code', 'refresh_token']);
  });

  it('protected-resource discovery points at the MCP endpoint', () => {
    const result = ctrl.protectedResourceDiscovery(makeReq()) as Record<string, unknown>;
    expect(result['resource']).toBe('https://kanban.test/api/v1/mcp');
    expect(result['bearer_methods_supported']).toEqual(['header']);
  });
});

describe('OauthController — register', () => {
  const ctrl = new OauthController();
  const body = {
    client_name: 'Claude.ai',
    redirect_uris: ['https://claude.ai/cb'],
    token_endpoint_auth_method: 'none' as const,
  };

  it('registers anonymously (no session) and exposes RFC 7591 fields', async () => {
    vi.mocked(oauthService.registerClient).mockResolvedValue({
      id: 'cid', name: 'Claude.ai', redirectUris: ['https://claude.ai/cb'],
      isPublic: true, createdBy: null, createdAt: '2026-05-28T20:00:00Z',
      clientSecret: null,
    } as never);
    const result = await ctrl.register(body, makeReq());
    expect(oauthService.registerClient).toHaveBeenCalledWith(
      { name: 'Claude.ai', redirectUris: ['https://claude.ai/cb'], isPublic: true },
      null,
    );
    expect(result).toMatchObject({
      client_id: 'cid',
      client_secret: null,
      token_endpoint_auth_method: 'none',
    });
  });

  it('attaches the logged-in user as owner when a session exists', async () => {
    vi.mocked(oauthService.registerClient).mockResolvedValue({
      id: 'cid', name: 'X', redirectUris: ['https://x.test/cb'],
      isPublic: false, createdBy: 'u1', createdAt: '2026-05-28T20:00:00Z',
      clientSecret: 'pios_secret',
    } as never);
    const req = makeReq({ session: { user: { id: 'u1' } } });
    const result = await ctrl.register(
      { ...body, token_endpoint_auth_method: 'client_secret_post' },
      req,
    );
    expect(oauthService.registerClient).toHaveBeenCalledWith(
      expect.objectContaining({ isPublic: false }),
      'u1',
    );
    expect(result).toMatchObject({
      client_secret: 'pios_secret',
      token_endpoint_auth_method: 'client_secret_post',
    });
  });
});

describe('OauthController — owner-only client CRUD', () => {
  const ctrl = new OauthController();

  it('listClients delegates to service.listClients(userId)', () => {
    vi.mocked(oauthService.listClients).mockReturnValue([{ id: 'cid' }] as never);
    expect(ctrl.listClients(USER)).toEqual({ data: [{ id: 'cid' }] });
    expect(oauthService.listClients).toHaveBeenCalledWith('u1');
  });

  it('revokeClient delegates to service.revokeClient(clientId, userId)', () => {
    ctrl.revokeClient('cid', USER);
    expect(oauthService.revokeClient).toHaveBeenCalledWith('cid', 'u1');
  });
});

describe('OauthController — /authorize', () => {
  const ctrl = new OauthController();

  function withClient() {
    vi.mocked(oauthService.getClient).mockReturnValue({
      id: 'cid',
      name: 'Claude',
      redirectUris: ['https://claude.ai/cb'],
      isPublic: true,
      createdBy: null,
      createdAt: '2026-05-28T20:00:00Z',
    } as never);
  }

  it('renders an error HTML when response_type is not "code"', () => {
    withClient();
    const req = makeReq({
      query: {
        response_type: 'token',
        code_challenge_method: 'S256',
        client_id: 'cid',
        redirect_uri: 'https://claude.ai/cb',
        code_challenge: 'x'.repeat(43),
      },
    });
    const res = makeRes();
    ctrl.authorizeGet(req, res);
    expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(400);
  });

  it('redirects to /login when there is no session', () => {
    withClient();
    const req = makeReq({
      originalUrl: '/api/v1/oauth/authorize?response_type=code&...',
      query: {
        response_type: 'code',
        code_challenge_method: 'S256',
        client_id: 'cid',
        redirect_uri: 'https://claude.ai/cb',
        code_challenge: 'x'.repeat(43),
      },
    });
    const res = makeRes();
    ctrl.authorizeGet(req, res);
    expect((res as { redirect: ReturnType<typeof vi.fn> }).redirect).toHaveBeenCalledWith(
      expect.stringMatching(/^\/login\?next=/),
    );
  });

  it('POST /authorize with action=deny bounces back with access_denied', () => {
    withClient();
    const req = makeReq({
      session: { user: { id: 'u1' } },
      query: {
        response_type: 'code',
        code_challenge_method: 'S256',
        client_id: 'cid',
        redirect_uri: 'https://claude.ai/cb',
        code_challenge: 'x'.repeat(43),
        state: 'abc',
      },
      body: { action: 'deny' },
    });
    const res = makeRes();
    ctrl.authorizePost(req, res);
    expect((res as { redirect: ReturnType<typeof vi.fn> }).redirect).toHaveBeenCalledWith(
      expect.stringContaining('error=access_denied'),
    );
  });

  it('POST /authorize with action=approve issues a code via the service', () => {
    withClient();
    vi.mocked(oauthService.createAuthorizationCode).mockReturnValue('pioc_xyz' as never);
    const req = makeReq({
      session: { user: { id: 'u1' } },
      query: {
        response_type: 'code',
        code_challenge_method: 'S256',
        client_id: 'cid',
        redirect_uri: 'https://claude.ai/cb',
        code_challenge: 'x'.repeat(43),
        state: 's1',
      },
      body: { action: 'approve' },
    });
    const res = makeRes();
    ctrl.authorizePost(req, res);
    expect(oauthService.createAuthorizationCode).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'cid', userId: 'u1' }),
    );
    expect((res as { redirect: ReturnType<typeof vi.fn> }).redirect).toHaveBeenCalledWith(
      expect.stringContaining('code=pioc_xyz'),
    );
  });
});

describe('OauthController — /token + /revoke', () => {
  const ctrl = new OauthController();

  it('exchanges an authorization_code grant', async () => {
    vi.mocked(oauthService.exchangeCode).mockResolvedValue({
      accessToken: 'pioa_a',
      refreshToken: 'pior_r',
      expiresIn: 3600,
      scopes: ['mcp.read'],
      audience: 'aud',
    } as never);
    const res = makeRes();
    await ctrl.token(
      {
        grant_type: 'authorization_code',
        code: 'pioc_xyz',
        client_id: 'cid',
        redirect_uri: 'https://claude.ai/cb',
        code_verifier: 'v',
      },
      res,
    );
    expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith({
      access_token: 'pioa_a',
      refresh_token: 'pior_r',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'mcp.read',
    });
  });

  it('exchanges a refresh_token grant', async () => {
    vi.mocked(oauthService.refreshAccessToken).mockResolvedValue({
      accessToken: 'pioa_b',
      refreshToken: 'pior_r2',
      expiresIn: 3600,
      scopes: [],
      audience: 'aud',
    } as never);
    const res = makeRes();
    await ctrl.token({ grant_type: 'refresh_token', refresh_token: 'pior_r', client_id: 'cid' }, res);
    expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith(
      expect.objectContaining({ access_token: 'pioa_b' }),
    );
  });

  it('returns 400 unsupported_grant_type for unknown grants', async () => {
    const res = makeRes();
    await ctrl.token({ grant_type: 'password', username: 'x', password: 'y' }, res);
    expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(400);
    expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith({
      error: 'unsupported_grant_type',
    });
  });

  it('translates service errors to 401 invalid_grant', async () => {
    vi.mocked(oauthService.exchangeCode).mockRejectedValue(new Error('Invalid authorization code'));
    const res = makeRes();
    await ctrl.token(
      { grant_type: 'authorization_code', code: 'bad', client_id: 'cid', redirect_uri: 'u', code_verifier: 'v' },
      res,
    );
    expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(401);
    expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith({
      error: 'invalid_grant',
      error_description: 'Invalid authorization code',
    });
  });

  it('revoke calls the service and returns 200 even for unknown tokens (RFC 7009)', () => {
    ctrl.revoke({ token: 'whatever' });
    expect(oauthService.revokeAccessToken).toHaveBeenCalledWith('whatever');
  });
});
