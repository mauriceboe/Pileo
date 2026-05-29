import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth.store';
import { server, http, HttpResponse } from '../test/msw-server';

import type { UserPublic } from '@pileo/shared';

const MOCK_USER: UserPublic = {
  id: 'u1',
  email: 'test@example.com',
  username: 'test',
  displayName: 'Test User',
  role: 'user',
  avatarPath: null,
  lastLoginAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('auth.store', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: true });
  });

  it('login populates user + isAuthenticated', async () => {
    server.use(
      http.post('/api/v1/auth/login', () => HttpResponse.json({ data: MOCK_USER })),
    );

    await useAuthStore.getState().login({ email: 'test@example.com', password: 'pw1234567' });

    expect(useAuthStore.getState().user).toEqual(MOCK_USER);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('logout clears user + isAuthenticated', async () => {
    useAuthStore.setState({ user: MOCK_USER, isAuthenticated: true });
    server.use(
      http.post('/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
    );

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('fetchCurrentUser succeeds on 200', async () => {
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: MOCK_USER })),
    );

    await useAuthStore.getState().fetchCurrentUser();

    expect(useAuthStore.getState().user).toEqual(MOCK_USER);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('fetchCurrentUser handles 401 silently', async () => {
    // default handler returns 401
    await useAuthStore.getState().fetchCurrentUser();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
