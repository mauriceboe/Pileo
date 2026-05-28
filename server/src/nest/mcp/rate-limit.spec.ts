import { describe, it, expect } from 'vitest';
import { RateLimiter } from './rate-limit.js';

describe('RateLimiter', () => {
  it('allows requests up to the max and rejects the (max+1)-th in the same window', () => {
    const r = new RateLimiter({ windowMs: 60_000, max: 3 });
    const now = 1_000_000;
    expect(r.isLimited('u1', now)).toBe(false);
    expect(r.isLimited('u1', now + 10)).toBe(false);
    expect(r.isLimited('u1', now + 20)).toBe(false);
    // 4th call within window → over the limit
    expect(r.isLimited('u1', now + 30)).toBe(true);
  });

  it('resets the bucket when the window has elapsed', () => {
    const r = new RateLimiter({ windowMs: 60_000, max: 2 });
    const start = 5_000_000;
    r.isLimited('u1', start);
    r.isLimited('u1', start + 1);
    expect(r.isLimited('u1', start + 2)).toBe(true);
    // Past the window boundary → new bucket
    expect(r.isLimited('u1', start + 60_001)).toBe(false);
  });

  it('tracks buckets per key independently', () => {
    const r = new RateLimiter({ windowMs: 60_000, max: 1 });
    const now = 1_000;
    expect(r.isLimited('u1', now)).toBe(false);
    expect(r.isLimited('u2', now)).toBe(false);
    expect(r.isLimited('u1', now + 1)).toBe(true);
    expect(r.isLimited('u2', now + 1)).toBe(true);
  });

  it('prune drops only expired buckets', () => {
    const r = new RateLimiter({ windowMs: 60_000, max: 5 });
    r.isLimited('u1', 1_000);
    r.isLimited('u2', 50_000);
    r.isLimited('u3', 90_000);
    expect(r.size()).toBe(3);

    // At t = 70_000, u1's window started at 1_000 (age 69k) → expired.
    // u2 started at 50_000 (age 20k) → fresh. u3 likewise.
    const dropped = r.prune(70_000);
    expect(dropped).toBe(1);
    expect(r.size()).toBe(2);
  });

  it('rejects invalid options', () => {
    expect(() => new RateLimiter({ windowMs: 0, max: 1 })).toThrow();
    expect(() => new RateLimiter({ windowMs: 1000, max: 0 })).toThrow();
  });
});
