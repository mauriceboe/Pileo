import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useLogout } from './useLogout';
import { useAuthStore } from '../stores/auth.store';
import { server, http, HttpResponse } from '../test/msw-server';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('useLogout', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u1', email: 'a@b.c', username: 'a', displayName: 'A',
        role: 'user', avatarPath: null, lastLoginAt: null,
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('clears the auth store and navigates to /login', async () => {
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);

    server.use(
      http.post('/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
    );

    const { result } = renderHook(() => useLogout(), { wrapper });

    await act(async () => {
      await result.current();
    });

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
