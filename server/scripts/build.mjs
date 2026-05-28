#!/usr/bin/env node
// Build the server: tsc emits JS+types, tsc-alias rewrites any path aliases
// to relative requires that Node ESM can resolve at runtime.
//
// We DO NOT gate the emit on typecheck — `npm run typecheck` is the dedicated
// gate. This mirrors TREK's setup: ship-on-type-error is sometimes needed
// during a migration, but typecheck stays as a separate CI/local check.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, '..');

function run(cmd, args, allowFail = false) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: serverDir, shell: process.platform === 'win32' });
  if (r.status !== 0 && !allowFail) process.exit(r.status ?? 1);
  return r.status ?? 0;
}

// 1. Build shared package first (server imports it)
run('npm', ['run', 'build', '-w', '@pileo/shared'], false);

// 2. Emit server TS — allow type errors to still produce output during migration
run('npx', ['tsc', '-p', 'tsconfig.json'], true);

// 3. Rewrite path aliases in emitted JS
run('npx', ['tsc-alias', '-p', 'tsconfig.json'], false);
