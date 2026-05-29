import { expect, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { server } from './msw-server';

expect.extend(matchers);

server.listen({ onUnhandledRequest: 'error' });

afterEach(() => {
  cleanup();
  server.resetHandlers();
});
