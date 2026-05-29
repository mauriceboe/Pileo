import { useEffect, useState } from 'react';
import type { ApiSuccessResponse } from '@pileo/shared';
import { apiClient } from '../api/client';

// Compile-time fallback: Vite injects the client's own package.json version via
// define() in vite.config.ts. Even if the server is unreachable we still render
// *something* in the UI rather than a blank slot.
declare const __APP_VERSION__: string;

let cachedVersion: string | null = null;
let inflightFetch: Promise<string> | null = null;

// Exposed for tests so each spec can start fresh; never called from app code.
export function __resetAppVersionCacheForTests(): void {
  cachedVersion = null;
  inflightFetch = null;
}

async function fetchVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  if (inflightFetch) return inflightFetch;

  inflightFetch = (async () => {
    try {
      const body = await apiClient.get<ApiSuccessResponse<{ version: string }>>('/version');
      cachedVersion = body.data.version;
      return cachedVersion;
    } catch {
      // Server unreachable / pre-deploy: fall back to the build-time version
      cachedVersion = __APP_VERSION__;
      return cachedVersion;
    }
  })();

  try {
    return await inflightFetch;
  } finally {
    inflightFetch = null;
  }
}

export function useAppVersion(): string {
  const [version, setVersion] = useState<string>(() => cachedVersion ?? __APP_VERSION__);

  useEffect(() => {
    let cancelled = false;
    fetchVersion().then((v) => {
      if (!cancelled) setVersion(v);
    });
    return () => { cancelled = true; };
  }, []);

  return version;
}
