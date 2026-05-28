#!/usr/bin/env node
// Read-only parity sentinel for the strangler-fig migration.
//
// Hits a list of stable, idempotent GET endpoints against a running Pileo
// instance and snapshots the response body to disk. On the next run, any
// body that differs from its snapshot raises an error — that is the only
// signal we have that a Nest migration silently changed wire output.
//
// Usage:
//   PILEO_BASE_URL=https://kanban.pakulat.org \
//   PILEO_API_TOKEN=pil_… \
//   PILEO_TREK_PROJECT=263ac5af-… \
//   node scripts/parity-check.mjs
//
// Add --update to rebase the snapshots after an intentional change.
// Snapshots live in server/scripts/parity-snapshots/ and are git-tracked.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';

const BASE = process.env.PILEO_BASE_URL ?? 'https://kanban.pakulat.org';
const TOKEN = process.env.PILEO_API_TOKEN;
const PROJECT = process.env.PILEO_TREK_PROJECT ?? '263ac5af-8c12-42c0-af32-9c13ade15e23';
const UPDATE = process.argv.includes('--update');

if (!TOKEN) {
  console.error('PILEO_API_TOKEN required');
  process.exit(2);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const snapshotDir = path.join(here, 'parity-snapshots');
await mkdir(snapshotDir, { recursive: true });

// Each entry is one HTTP call. Keep these idempotent and side-effect-free
// — POST/PATCH/DELETE belong in a separate harness that uses a sandbox DB.
const ENDPOINTS = [
  // Migrated → Nest
  { name: 'labels.list',       method: 'GET', path: `/api/v1/projects/${PROJECT}/labels` },
  // Still on Legacy (parity baseline)
  { name: 'projects.list',     method: 'GET', path: '/api/v1/projects' },
  { name: 'project.boards',    method: 'GET', path: `/api/v1/projects/${PROJECT}/boards` },
  // Error envelopes — the AppErrorFilter shape must stay byte-stable
  { name: 'labels.unknownProject', method: 'GET', path: '/api/v1/projects/00000000-0000-0000-0000-000000000000/labels' },
  { name: 'unauth.labels',     method: 'GET', path: `/api/v1/projects/${PROJECT}/labels`, anonymous: true },
];

function safeName(s) {
  return s.replace(/[^a-z0-9._-]/gi, '_');
}

// Drop timestamps + IDs that change per row so snapshots aren't brittle
// against benign data churn. Anything outside that allow-list is checked
// byte-for-byte.
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'createdAt' || k === 'updatedAt' || k === 'lastUsedAt') out[k] = '<timestamp>';
      else out[k] = normalize(v);
    }
    return out;
  }
  return value;
}

let failures = 0;
let written = 0;

for (const ep of ENDPOINTS) {
  const headers = { Accept: 'application/json' };
  if (!ep.anonymous) headers.Authorization = `Bearer ${TOKEN}`;

  const res = await fetch(`${BASE}${ep.path}`, { method: ep.method, headers });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { __raw: text }; }

  const snapshot = {
    name: ep.name,
    method: ep.method,
    path: ep.path,
    anonymous: ep.anonymous ?? false,
    status: res.status,
    body: normalize(body),
  };
  const serialized = JSON.stringify(snapshot, null, 2) + '\n';
  const file = path.join(snapshotDir, `${safeName(ep.name)}.json`);

  let prior = null;
  try { prior = await readFile(file, 'utf8'); } catch { /* no snapshot yet */ }

  if (prior === null || UPDATE) {
    await writeFile(file, serialized, 'utf8');
    written++;
    console.log(`${prior === null ? 'WRITE' : 'UPDATE'}  ${ep.name}  HTTP ${res.status}  (${sha8(serialized)})`);
    continue;
  }

  if (prior === serialized) {
    console.log(`OK     ${ep.name}  HTTP ${res.status}`);
    continue;
  }

  failures++;
  console.error(`DIFF   ${ep.name}  HTTP ${res.status}`);
  console.error(diffSummary(prior, serialized));
}

function sha8(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 8);
}

function diffSummary(a, b) {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const out = [];
  const max = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < max && out.length < 20; i++) {
    if (aLines[i] !== bLines[i]) {
      out.push(`  - ${aLines[i] ?? ''}`);
      out.push(`  + ${bLines[i] ?? ''}`);
    }
  }
  return out.join('\n');
}

if (failures > 0) {
  console.error(`\n${failures} endpoint(s) diverged. Inspect, then rerun with --update if the change is intentional.`);
  process.exit(1);
}
if (written > 0) {
  console.log(`\n${written} snapshot(s) ${UPDATE ? 'updated' : 'created'}.`);
}
console.log(`\n${ENDPOINTS.length} endpoint(s) checked, ${failures} failure(s).`);
