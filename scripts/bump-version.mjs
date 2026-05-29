#!/usr/bin/env node
// Bump the project's version using Pileo's single-digit rollover scheme.
//
//   0.1.0 → 0.1.1 → … → 0.1.9 → 0.2.0
//   0.2.0 → … → 0.9.0 → 1.0.0
//   1.0.0 → 1.0.1 → …
//
// In other words: every component (major/minor/patch) caps at 9 and rolls into
// the next slot. Patch rolls into minor at 10, minor rolls into major at 10.
// Major has no cap — once you cross 0.9.9 you enter 1.x and the same rules apply.
//
// Writes the new version back to the root + workspace package.json files and
// prints it to stdout so CI can use it as a tag.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = [
  'package.json',
  'client/package.json',
  'server/package.json',
  'packages/shared/package.json',
];

function readVersion(rel) {
  const pkg = JSON.parse(readFileSync(join(repoRoot, rel), 'utf-8'));
  return pkg.version;
}

function bump(version) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Unrecognised version: ${version}`);
  }
  let [major, minor, patch] = parts;
  patch += 1;
  if (patch >= 10) {
    patch = 0;
    minor += 1;
  }
  if (minor >= 10) {
    minor = 0;
    major += 1;
  }
  return `${major}.${minor}.${patch}`;
}

function writeVersion(rel, version) {
  const path = join(repoRoot, rel);
  const raw = readFileSync(path, 'utf-8');
  const pkg = JSON.parse(raw);
  if (pkg.version === version) return;
  pkg.version = version;
  // Keep trailing newline so the file matches editorconfig expectations.
  const out = `${JSON.stringify(pkg, null, 2)}\n`;
  writeFileSync(path, out);
}

const current = readVersion('package.json');
const next = bump(current);

for (const rel of TARGETS) {
  writeVersion(rel, next);
}

// stdout: only the next version, so callers can `NEW=$(node scripts/bump-version.mjs)`.
process.stdout.write(next);
