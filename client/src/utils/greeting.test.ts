import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTimeGreeting, getQuote } from './greeting';

describe('getTimeGreeting', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('says good morning before noon', () => {
    vi.setSystemTime(new Date('2026-05-29T08:00:00'));
    expect(getTimeGreeting()).toBe('Good morning');
  });

  it('says good afternoon between noon and 18', () => {
    vi.setSystemTime(new Date('2026-05-29T14:30:00'));
    expect(getTimeGreeting()).toBe('Good afternoon');
  });

  it('says good evening after 18', () => {
    vi.setSystemTime(new Date('2026-05-29T20:00:00'));
    expect(getTimeGreeting()).toBe('Good evening');
  });
});

describe('getQuote', () => {
  it('returns a non-empty string', () => {
    expect(getQuote()).toMatch(/^".+"/);
  });

  it('is deterministic for a given day', () => {
    expect(getQuote()).toBe(getQuote());
  });
});
