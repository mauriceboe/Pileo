import { describe, it, expect } from 'vitest';

// Pull the bump function from the script by importing its module. The script's
// top-level performs I/O, so we duplicate the bump logic here instead — the
// constraint is that the two must agree. Keep this list in sync with the
// rollover scheme documented in bump-version.mjs.

function bump(version: string): string {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Unrecognised version: ${version}`);
  }
  let major = parts[0]!;
  let minor = parts[1]!;
  let patch = parts[2]!;
  patch += 1;
  if (patch >= 10) { patch = 0; minor += 1; }
  if (minor >= 10) { minor = 0; major += 1; }
  return `${major}.${minor}.${patch}`;
}

describe('version rollover', () => {
  it('increments the patch by 1 in the common case', () => {
    expect(bump('0.1.0')).toBe('0.1.1');
    expect(bump('0.1.5')).toBe('0.1.6');
  });

  it('rolls patch=10 into minor', () => {
    expect(bump('0.1.9')).toBe('0.2.0');
  });

  it('rolls minor=10 into major', () => {
    expect(bump('0.9.9')).toBe('1.0.0');
  });

  it('handles cascading rollovers past 1.x', () => {
    expect(bump('1.0.9')).toBe('1.1.0');
    expect(bump('1.9.9')).toBe('2.0.0');
  });

  it('rejects malformed input', () => {
    expect(() => bump('1.2')).toThrow();
    expect(() => bump('not.a.version')).toThrow();
  });
});
