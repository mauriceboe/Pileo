// Augments express-session with the fields Pileo actually stores in
// `req.session`. This removes the `as unknown as Record<string, unknown>`
// casts that used to sit at every session access site, so TypeScript can see
// the real shape instead of erasing it.

import 'express-session';
import type { UserPublic } from '@pileo/shared';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: UserPublic;
    /** Account-lockout state used by auth.service. */
    failedLoginAttempts?: number;
    lockoutUntil?: number;
    /** Used by the OAuth controller to carry consent payload between requests. */
    oauthConsent?: {
      clientId: string;
      redirectUri: string;
      codeChallenge: string;
      codeChallengeMethod: string;
      state?: string;
      scope?: string;
    };
  }
}
