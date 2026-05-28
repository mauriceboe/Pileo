import { describe, it, expect, afterAll } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type Database from 'better-sqlite3';
import { AppModule } from '../app.module.js';
import { SQLITE } from './database.tokens.js';
import { sqlite } from '../../config/database.js';

// Proves the SQLITE provider hands out the exact same better-sqlite3
// instance that legacy Express code uses. If a future refactor accidentally
// opens a second connection, this test will fail (different identity) and
// flag the WAL single-writer breakage before it ships.
describe('DatabaseModule', () => {
  it('exposes the legacy sqlite singleton via the SQLITE token', async () => {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    try {
      const injected = app.get<Database.Database>(SQLITE);
      expect(injected).toBe(sqlite);
      // Sanity: the injected handle is actually usable.
      const row = injected.prepare("SELECT 1 AS n").get() as { n: number };
      expect(row.n).toBe(1);
    } finally {
      await app.close();
    }
  });
});

afterAll(() => {
  // Don't close the shared sqlite handle here — other tests / runtime code
  // share it. The process tear-down handles it.
});
