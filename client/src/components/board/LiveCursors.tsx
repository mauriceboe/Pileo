import { useEffect, useCallback, useRef } from 'react';
import { useWebSocketStore } from '../../stores/websocket.store';
import { useAuthStore } from '../../stores/auth.store';
import styles from './live-cursors.module.css';

const CURSOR_COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4',
];

function getColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]!;
}

export function LiveCursors({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const cursors = useWebSocketStore((s) => s.cursors);
  const presenceUsers = useWebSocketStore((s) => s.presenceUsers);
  const sendCursor = useWebSocketStore((s) => s.sendCursor);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const throttleRef = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const now = Date.now();
    if (now - throttleRef.current < 50) return; // 20fps max
    throttleRef.current = now;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left + el.scrollLeft;
    const y = e.clientY - rect.top + el.scrollTop;
    sendCursor(x, y);
  }, [containerRef, sendCursor]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('mousemove', handleMouseMove);
    return () => el.removeEventListener('mousemove', handleMouseMove);
  }, [containerRef, handleMouseMove]);

  const userMap = new Map(presenceUsers.map((u) => [u.userId, u]));
  const taskFocus = useWebSocketStore((s) => s.taskFocus);

  return (
    <>
      {Array.from(cursors.values()).map((cursor) => {
        if (cursor.userId === currentUserId) return null;
        // Hide stale cursors (>5s)
        if (Date.now() - cursor.updatedAt > 5000) return null;
        // Hide cursor if user has a task popup open
        if (taskFocus.get(cursor.userId)) return null;
        const user = userMap.get(cursor.userId);
        const name = user?.displayName || user?.username || '?';
        const color = getColor(cursor.userId);

        return (
          <div
            key={cursor.userId}
            className={styles.cursor}
            style={{
              left: cursor.x,
              top: cursor.y,
              '--cursor-color': color,
            } as React.CSSProperties}
          >
            {/* SVG cursor arrow */}
            <svg className={styles.arrow} width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path
                d="M1 1L6.5 18L9 10.5L15.5 8.5L1 1Z"
                fill={color}
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span className={styles.label} style={{ backgroundColor: color }}>
              {name}
            </span>
          </div>
        );
      })}
    </>
  );
}
