import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAppVersion, __resetAppVersionCacheForTests } from './useAppVersion';
import { server, http, HttpResponse } from '../test/msw-server';

describe('useAppVersion', () => {
  beforeEach(() => {
    __resetAppVersionCacheForTests();
  });

  it('initially returns the build-time fallback', () => {
    const { result } = renderHook(() => useAppVersion());
    // __APP_VERSION__ is defined in vitest.config.ts as '0.0.0-test'
    expect(typeof result.current).toBe('string');
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('replaces the fallback with the server version when reachable', async () => {
    server.use(
      http.get('/api/v1/version', () => HttpResponse.json({ data: { version: '1.2.3' } })),
    );

    const { result } = renderHook(() => useAppVersion());

    await waitFor(() => {
      expect(result.current).toBe('1.2.3');
    });
  });
});
