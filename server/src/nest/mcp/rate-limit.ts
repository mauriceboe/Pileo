// In-memory sliding-bucket rate limiter, keyed by an opaque identifier
// (we use userId in MCP). Single-process only — would need Redis or a
// shared store the day Pileo runs behind more than one node.
//
// The "now" parameter is injectable for deterministic tests; production
// code calls without it and gets Date.now().

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
}

interface Bucket {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs: number;
  private readonly max: number;

  constructor(opts: RateLimiterOptions) {
    if (opts.windowMs <= 0) throw new Error('windowMs must be positive');
    if (opts.max <= 0) throw new Error('max must be positive');
    this.windowMs = opts.windowMs;
    this.max = opts.max;
  }

  // Returns true if the caller is OVER the limit (i.e. the request should
  // be rejected). Increments the bucket as a side effect so each call
  // counts towards the window.
  isLimited(key: string, now: number = Date.now()): boolean {
    const entry = this.buckets.get(key);
    if (!entry || now - entry.windowStart > this.windowMs) {
      this.buckets.set(key, { count: 1, windowStart: now });
      return false;
    }
    entry.count++;
    return entry.count > this.max;
  }

  // Drop entries whose window has fully elapsed. Cheap O(n) sweep; we run
  // it from the session-manager sweep loop, not on every request.
  prune(now: number = Date.now()): number {
    const cutoff = now - this.windowMs;
    let dropped = 0;
    for (const [key, entry] of this.buckets) {
      if (entry.windowStart < cutoff) {
        this.buckets.delete(key);
        dropped++;
      }
    }
    return dropped;
  }

  size(): number {
    return this.buckets.size;
  }
}
