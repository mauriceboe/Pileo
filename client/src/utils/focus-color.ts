const FOCUS_COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4',
];

// Deterministic per-user colour for presence outlines / focus tags.
// Same userId always maps to the same colour across the session.
export function getFocusColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return FOCUS_COLORS[Math.abs(hash) % FOCUS_COLORS.length]!;
}
