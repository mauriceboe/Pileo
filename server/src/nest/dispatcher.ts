// Pure path-matching for the top-level Nest/Legacy dispatcher. Lives in
// its own module so unit tests can exercise it without booting the HTTP
// stack.
//
// Patterns accept a single wildcard syntax: `*` matches one path segment
// (no slashes). A pattern without `*` behaves like a plain prefix that
// also matches child paths — i.e. "/api/v1/mcp" matches "/api/v1/mcp"
// and "/api/v1/mcp/anything" but NOT "/api/v1/mcpx" (substring trap).

interface CompiledMatcher {
  /** Original pattern, retained for diagnostics. */
  pattern: string;
  test: (path: string) => boolean;
}

const ESCAPE_REGEX = /[.+?^${}()|[\]\\]/g;

function compileGlob(pattern: string): CompiledMatcher {
  const escaped = pattern.replace(ESCAPE_REGEX, '\\$&').replace(/\*/g, '[^/]+');
  const re = new RegExp(`^${escaped}(?:/.*)?$`);
  return { pattern, test: (p) => re.test(p) };
}

function compilePrefix(prefix: string): CompiledMatcher {
  const normalized = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  return {
    pattern: prefix,
    test: (p) => p === normalized || p.startsWith(normalized + '/'),
  };
}

export function compileMatchers(patterns: readonly string[]): CompiledMatcher[] {
  const matchers: CompiledMatcher[] = [];
  for (const raw of patterns) {
    if (!raw) continue;
    matchers.push(raw.includes('*') ? compileGlob(raw) : compilePrefix(raw));
  }
  return matchers;
}

export function pathBelongsToNest(reqPath: string, patterns: readonly string[]): boolean {
  for (const m of compileMatchers(patterns)) {
    if (m.test(reqPath)) return true;
  }
  return false;
}
