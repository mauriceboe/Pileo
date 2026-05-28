// Raw better-sqlite3 — app_settings is a two-column key/value store with
// no joins or migrations; the drizzle wrapping would be pure ceremony.

import { sqlite } from '../config/database.js';

export function getSetting(key: string): string | null {
  const row = sqlite.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  sqlite.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
}

export function isRegistrationEnabled(): boolean {
  return getSetting('registration_enabled') !== 'false';
}
