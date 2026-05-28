import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpSessionRegistry, MAX_SESSIONS_PER_USER, SESSION_TTL_MS } from './session-manager.js';

function fakeSession(userId: string, lastActivity: number) {
  return {
    server: { close: vi.fn() },
    transport: { close: vi.fn() },
    userId,
    projectId: 'p1',
    lastActivity,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('McpSessionRegistry', () => {
  let registry: McpSessionRegistry;

  beforeEach(() => {
    registry = new McpSessionRegistry();
    vi.useFakeTimers();
  });
  afterEach(() => {
    registry.closeAll();
    vi.useRealTimers();
  });

  it('add + get round-trip and size', () => {
    const s = fakeSession('u1', Date.now());
    registry.add('sid1', s);
    expect(registry.get('sid1')).toBe(s);
    expect(registry.size()).toBe(1);
  });

  it('delete closes server + transport and removes from the map', () => {
    const s = fakeSession('u1', Date.now());
    registry.add('sid1', s);
    registry.delete('sid1');
    expect(registry.get('sid1')).toBeUndefined();
    expect(s.server.close).toHaveBeenCalledTimes(1);
    expect(s.transport.close).toHaveBeenCalledTimes(1);
  });

  it('delete is a safe no-op for unknown ids', () => {
    expect(() => registry.delete('nope')).not.toThrow();
  });

  it('swallows close errors so one broken session cannot block cleanup', () => {
    const s = fakeSession('u1', Date.now());
    s.server.close.mockImplementation(() => { throw new Error('server boom'); });
    s.transport.close.mockImplementation(() => { throw new Error('tx boom'); });
    registry.add('sid1', s);
    expect(() => registry.delete('sid1')).not.toThrow();
    expect(registry.get('sid1')).toBeUndefined();
  });

  it('countForUser ignores sessions older than the TTL', () => {
    const now = Date.now();
    registry.add('a', fakeSession('u1', now));
    registry.add('b', fakeSession('u1', now - SESSION_TTL_MS - 1));
    registry.add('c', fakeSession('u2', now));
    expect(registry.countForUser('u1')).toBe(1);
    expect(registry.countForUser('u2')).toBe(1);
    expect(registry.countForUser('u3')).toBe(0);
  });

  it('sweeper drops expired sessions and keeps fresh ones', () => {
    const now = Date.now();
    registry.add('fresh', fakeSession('u1', now));
    registry.add('stale', fakeSession('u1', now - SESSION_TTL_MS - 1));

    registry.startSweeper();
    // Default sweep interval is 60s.
    vi.advanceTimersByTime(60_001);

    expect(registry.get('fresh')).toBeDefined();
    expect(registry.get('stale')).toBeUndefined();
  });

  it('startSweeper is idempotent', () => {
    registry.startSweeper();
    const sizeBefore = registry.size();
    registry.startSweeper(); // second call should not duplicate the interval
    vi.advanceTimersByTime(60_001);
    expect(registry.size()).toBe(sizeBefore);
  });

  it('closeAll empties the map and stops the sweeper', () => {
    registry.add('a', fakeSession('u1', Date.now()));
    registry.add('b', fakeSession('u2', Date.now()));
    registry.startSweeper();
    registry.closeAll();
    expect(registry.size()).toBe(0);

    // No sessions left, advancing time must not throw.
    vi.advanceTimersByTime(60_001);
  });

  it('exposes the configured limits as constants', () => {
    expect(MAX_SESSIONS_PER_USER).toBeGreaterThan(0);
    expect(SESSION_TTL_MS).toBeGreaterThan(0);
  });
});
