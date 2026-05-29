import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  // Default unauthenticated state — most pages will hit this first
  http.get('/api/v1/auth/me', () => HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not signed in' } }, { status: 401 })),
);

export { http, HttpResponse };
