#!/usr/bin/env node
// Dev runner — single initial build, then watch tsc + tsc-alias + node.
//
// We need this instead of `tsx watch` because NestJS DI requires
// `emitDecoratorMetadata` which tsx/esbuild does not emit.

import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, '..');

function runSync(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: serverDir, shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function runWatch(cmd, args) {
  return spawn(cmd, args, { stdio: 'inherit', cwd: serverDir, shell: process.platform === 'win32' });
}

// 1. Initial build so dist/ exists before node --watch starts
runSync('node', ['scripts/build.mjs']);

// 2. Parallel watchers
const tscWatch = runWatch('npx', ['tsc', '-w', '-p', 'tsconfig.json', '--preserveWatchOutput']);
const aliasWatch = runWatch('npx', ['tsc-alias', '-w', '-p', 'tsconfig.json']);
const nodeWatch = runWatch('node', ['--watch', 'dist/index.js']);

const procs = [tscWatch, aliasWatch, nodeWatch];

function shutdown() {
  for (const p of procs) {
    try { p.kill('SIGTERM'); } catch { /* ignore */ }
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
