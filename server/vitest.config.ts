import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

// Vitest with SWC so constructor-injection Nest tests work — esbuild
// (Vitest's default transform) does not emit decorator metadata, which
// breaks `@Injectable()` services that rely on parameter types for DI.
//
// SWC is a no-op for the tool/rate-limit/session-manager specs that
// instantiate classes directly; we adopt it now so the next domain
// module (Labels etc.) can write controller+service tests without a
// surprise reconfigure.
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
        keepClassNames: true,
      },
    }),
  ],
  test: {
    globals: false,
    include: ['src/**/*.spec.ts'],
  },
});
