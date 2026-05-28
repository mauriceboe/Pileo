// Pure path-matching for the top-level Nest/Legacy dispatcher.
// Lives in its own module so unit tests can exercise it without booting the
// full HTTP stack.

export function pathBelongsToNest(reqPath: string, prefixes: readonly string[]): boolean {
  for (const prefix of prefixes) {
    if (!prefix) continue;
    const normalized = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
    if (reqPath === normalized) return true;
    if (reqPath.startsWith(normalized + '/')) return true;
  }
  return false;
}
