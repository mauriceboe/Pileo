import { describe, it, expect } from 'vitest';
import { compileMatchers, matches } from './dispatcher.js';

// Tests use the same two-step API the production dispatcher uses
// (compile-once, match-per-request) so a regression in either half
// shows up here instead of only in production.
function check(reqPath: string, patterns: readonly string[]): boolean {
  return matches(compileMatchers(patterns), reqPath);
}

describe('dispatcher matching', () => {
  it('returns false when no prefixes are configured', () => {
    expect(check('/api/v1/anything', [])).toBe(false);
  });

  it('matches exact prefix', () => {
    expect(check('/api/v1/mcp', ['/api/v1/mcp'])).toBe(true);
  });

  it('matches child paths under the prefix', () => {
    expect(check('/api/v1/mcp/messages', ['/api/v1/mcp'])).toBe(true);
  });

  it('does not match a sibling whose name starts with the prefix', () => {
    expect(check('/api/v1/mcpx', ['/api/v1/mcp'])).toBe(false);
  });

  it('treats trailing slash on the configured prefix as equivalent', () => {
    expect(check('/api/v1/mcp', ['/api/v1/mcp/'])).toBe(true);
    expect(check('/api/v1/mcp/x', ['/api/v1/mcp/'])).toBe(true);
  });

  it('matches if any of multiple configured prefixes hits', () => {
    expect(check('/api/v1/labels/x', ['/api/v1/mcp', '/api/v1/labels'])).toBe(true);
  });

  it('ignores empty entries (defensive against bad env parsing)', () => {
    expect(check('/api/v1/mcp', ['', '/api/v1/mcp'])).toBe(true);
    expect(check('/anything', [''])).toBe(false);
  });

  it('is case-sensitive (HTTP paths are case-sensitive per RFC 3986)', () => {
    expect(check('/api/v1/MCP', ['/api/v1/mcp'])).toBe(false);
  });

  // --- glob patterns ---

  it('glob pattern matches a single segment', () => {
    expect(check('/api/v1/projects/abc/labels', ['/api/v1/projects/*/labels'])).toBe(true);
  });

  it('glob pattern matches children of the matched segment', () => {
    expect(check('/api/v1/projects/abc/labels/xyz', ['/api/v1/projects/*/labels'])).toBe(true);
  });

  it('glob * is single-segment, does not eat slashes', () => {
    expect(check('/api/v1/projects/abc/def/labels', ['/api/v1/projects/*/labels'])).toBe(false);
  });

  it('glob does not match a sibling resource', () => {
    expect(check('/api/v1/projects/abc/boards', ['/api/v1/projects/*/labels'])).toBe(false);
  });

  it('glob requires the segment to be present (not empty)', () => {
    expect(check('/api/v1/projects//labels', ['/api/v1/projects/*/labels'])).toBe(false);
  });

  it('matchers are reusable — calling matches twice against same array works', () => {
    const m = compileMatchers(['/api/v1/labels']);
    expect(matches(m, '/api/v1/labels')).toBe(true);
    expect(matches(m, '/api/v1/labels/x')).toBe(true);
    expect(matches(m, '/api/v1/other')).toBe(false);
  });
});
