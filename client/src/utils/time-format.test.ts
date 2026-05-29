import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { timeAgo } from './time-format';

describe('timeAgo', () => {
  const FIXED_NOW = new Date('2026-05-29T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for under one minute', () => {
    const date = new Date(FIXED_NOW.getTime() - 30 * 1000).toISOString();
    expect(timeAgo(date)).toBe('Just now');
  });

  it('returns minutes for under one hour', () => {
    const date = new Date(FIXED_NOW.getTime() - 15 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe('15m ago');
  });

  it('returns hours for under one day', () => {
    const date = new Date(FIXED_NOW.getTime() - 5 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe('5h ago');
  });

  it('returns days for under one week', () => {
    const date = new Date(FIXED_NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe('3d ago');
  });

  it('returns a formatted date for older entries', () => {
    const date = new Date('2026-04-10T12:00:00Z').toISOString();
    expect(timeAgo(date)).toBe('Apr 10');
  });
});
