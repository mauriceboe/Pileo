import { describe, it, expect } from 'vitest';
import { getFocusColor } from './focus-color';

const HEX_COLOR_RE = /^#[0-9A-F]{6}$/i;

describe('getFocusColor', () => {
  it('always returns a valid hex colour from the fixed palette', () => {
    expect(getFocusColor('alpha')).toMatch(HEX_COLOR_RE);
    expect(getFocusColor('')).toMatch(HEX_COLOR_RE);
    expect(getFocusColor('a-very-long-user-id-with-dashes')).toMatch(HEX_COLOR_RE);
  });

  it('is deterministic across calls', () => {
    expect(getFocusColor('user-1')).toBe(getFocusColor('user-1'));
    expect(getFocusColor('user-2')).toBe(getFocusColor('user-2'));
  });

  it('distributes across different inputs (no single dominant colour)', () => {
    const colours = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      colours.add(getFocusColor(`user-${i}`));
    }
    expect(colours.size).toBeGreaterThan(2);
  });
});
