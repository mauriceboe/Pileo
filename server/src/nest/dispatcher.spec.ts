import { describe, it, expect } from 'vitest';
import { pathBelongsToNest } from './dispatcher.js';

describe('pathBelongsToNest', () => {
  it('returns false when no prefixes are configured', () => {
    expect(pathBelongsToNest('/api/v1/anything', [])).toBe(false);
  });

  it('matches exact prefix', () => {
    expect(pathBelongsToNest('/api/v1/mcp', ['/api/v1/mcp'])).toBe(true);
  });

  it('matches child paths under the prefix', () => {
    expect(pathBelongsToNest('/api/v1/mcp/messages', ['/api/v1/mcp'])).toBe(true);
  });

  it('does not match a sibling whose name starts with the prefix', () => {
    // Substring trap: "/api/v1/mcp" must NOT match "/api/v1/mcpx".
    expect(pathBelongsToNest('/api/v1/mcpx', ['/api/v1/mcp'])).toBe(false);
  });

  it('treats trailing slash on the configured prefix as equivalent', () => {
    expect(pathBelongsToNest('/api/v1/mcp', ['/api/v1/mcp/'])).toBe(true);
    expect(pathBelongsToNest('/api/v1/mcp/x', ['/api/v1/mcp/'])).toBe(true);
  });

  it('matches if any of multiple configured prefixes hits', () => {
    expect(pathBelongsToNest('/api/v1/labels/x', ['/api/v1/mcp', '/api/v1/labels'])).toBe(true);
  });

  it('ignores empty entries (defensive against bad env parsing)', () => {
    expect(pathBelongsToNest('/api/v1/mcp', ['', '/api/v1/mcp'])).toBe(true);
    expect(pathBelongsToNest('/anything', [''])).toBe(false);
  });

  it('is case-sensitive (HTTP paths are case-sensitive per RFC 3986)', () => {
    expect(pathBelongsToNest('/api/v1/MCP', ['/api/v1/mcp'])).toBe(false);
  });

  // --- glob patterns (added for Labels — single * = one path segment) ---

  it('glob pattern matches a single segment', () => {
    expect(pathBelongsToNest('/api/v1/projects/abc/labels', ['/api/v1/projects/*/labels'])).toBe(true);
  });

  it('glob pattern matches children of the matched segment', () => {
    expect(pathBelongsToNest('/api/v1/projects/abc/labels/xyz', ['/api/v1/projects/*/labels'])).toBe(true);
  });

  it('glob * is single-segment, does not eat slashes', () => {
    expect(pathBelongsToNest('/api/v1/projects/abc/def/labels', ['/api/v1/projects/*/labels'])).toBe(false);
  });

  it('glob does not match a sibling resource', () => {
    expect(pathBelongsToNest('/api/v1/projects/abc/boards', ['/api/v1/projects/*/labels'])).toBe(false);
  });

  it('glob requires the segment to be present (not empty)', () => {
    expect(pathBelongsToNest('/api/v1/projects//labels', ['/api/v1/projects/*/labels'])).toBe(false);
  });
});
