import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Star, Zap, Rocket, Target, Flag, Heart, Coffee, Sun,
  Moon, Cloud, Flame, Music, Camera, Gift, Award, Bookmark,
  Bell, Globe, Lightbulb, Shield, Check, CheckCircle,
  Clock, Eye, Home, Inbox, Layers, Mail, Map, Megaphone,
  Palette, Pencil, Play, Search, Send, Settings, Smile,
  Sparkles, ThumbsUp, TrendingUp, Upload, Users,
} from 'lucide-react';
import * as shareApi from '../api/share.api';
import styles from './shared-board-page.module.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = {
  check: Check, checkCircle: CheckCircle, star: Star, heart: Heart,
  thumbsUp: ThumbsUp, smile: Smile, sparkles: Sparkles, zap: Zap,
  rocket: Rocket, target: Target, flag: Flag, play: Play,
  trendingUp: TrendingUp, inbox: Inbox, layers: Layers, clock: Clock,
  eye: Eye, search: Search, pencil: Pencil, send: Send, upload: Upload,
  coffee: Coffee, sun: Sun, moon: Moon, cloud: Cloud, flame: Flame,
  music: Music, camera: Camera, gift: Gift, award: Award,
  bookmark: Bookmark, bell: Bell, globe: Globe, lightbulb: Lightbulb,
  shield: Shield, mail: Mail, map: Map, megaphone: Megaphone,
  palette: Palette, users: Users, home: Home, settings: Settings,
};

interface SharedColumn {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  position: number;
}

interface SharedTask {
  id: string;
  title: string;
  description: string | null;
  position: number;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  labels: Array<{ name: string; color: string }>;
}

interface SharedBoardData {
  board: { id: string; name: string };
  columns: SharedColumn[];
  tasksByColumn: Record<string, SharedTask[]>;
}

export function SharedBoardPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedBoardData | null>(null);
  const [error, setError] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    shareApi.getSharedBoard(token).then(setData).catch(() => setError(true));
  }, [token]);

  // SSE live viewer count
  useEffect(() => {
    if (!token) return;
    const es = new EventSource(`/api/v1/shared/${token}/viewers`);
    es.onmessage = (event) => {
      try {
        const { count } = JSON.parse(event.data);
        setViewerCount(count);
      } catch {}
    };
    return () => es.close();
  }, [token]);

  // Horizontal scroll with mouse wheel (unless hovering a scrollable task area)
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0 || el.scrollWidth <= el.clientWidth) return;

      const target = e.target as HTMLElement | null;
      const taskArea = target?.closest(`.${styles.taskArea}`) as HTMLElement | null;
      if (taskArea && taskArea.scrollHeight > taskArea.clientHeight) {
        return;
      }

      e.preventDefault();
      el.scrollBy({ left: e.deltaY * 2, behavior: 'auto' });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [data]);

  if (error) {
    return (
      <div className={styles.centered}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>🔒</div>
          <h1 className={styles.errorTitle}>Link invalid or expired</h1>
          <p className={styles.errorHint}>This board may no longer be shared.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
      </div>
    );
  }

  const sortedColumns = [...data.columns].sort((a, b) => a.position - b.position);

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <span className={styles.logo}>Pileo <span className={styles.alphaBadge}>Alpha</span></span>
        <span className={styles.divider} />
        <span className={styles.boardName}>{data.board.name}</span>
        <span className={styles.badge}>View only</span>
        <span className={styles.spacer} />
        {viewerCount > 0 && (
          <span className={styles.viewers}>
            <Eye size={14} />
            <span>{viewerCount}</span>
          </span>
        )}
      </div>
      <div ref={boardRef} className={styles.board}>
        {sortedColumns.map((col) => {
          const tasks = data.tasksByColumn[col.id] ?? [];
          const IconComponent = col.icon ? ICON_MAP[col.icon] : null;
          return (
            <div key={col.id} className={styles.column}>
              <div className={styles.columnHeader} style={{ backgroundColor: col.color }}>
                <div className={styles.titleGroup}>
                  {IconComponent ? (
                    <span className={styles.iconWrapper}>
                      <IconComponent size={14} />
                    </span>
                  ) : (
                    <span className={styles.dot} />
                  )}
                  <span className={styles.columnName}>{col.name}</span>
                </div>
                <span className={styles.count}>{tasks.length}</span>
              </div>
              <div className={styles.taskArea}>
                {tasks.map((task) => {
                  const completed = !!task.completedAt;
                  const parsed = task.dueDate ? new Date(task.dueDate) : null;
                  const now = new Date();
                  const isOverdue = parsed && !completed && parsed < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const isDueToday = parsed && !completed && parsed.toDateString() === now.toDateString();
                  const hasPrio = task.priority && task.priority !== 'none' && !completed;

                  const banners: Array<{ text: string; cls: string }> = [];
                  if (completed) banners.push({ text: 'Completed', cls: styles.bannerCompleted! });
                  if (isOverdue) banners.push({ text: 'Overdue', cls: styles.bannerOverdue! });
                  if (isDueToday && !isOverdue) banners.push({ text: 'Due today', cls: styles.bannerDueToday! });
                  if (hasPrio) {
                    const labels: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
                    const cls: Record<string, string> = { low: styles.bannerPrioLow!, medium: styles.bannerPrioMedium!, high: styles.bannerPrioHigh!, urgent: styles.bannerPrioUrgent! };
                    banners.push({ text: labels[task.priority] ?? '', cls: cls[task.priority] ?? '' });
                  }

                  return (
                    <div key={task.id} className={styles.taskCard}>
                      {banners.length > 0 && (
                        <div className={styles.bannerRow}>
                          {banners.map((b, i) => (
                            <span key={i} className={`${styles.bannerPill} ${b.cls}`}>{b.text}</span>
                          ))}
                        </div>
                      )}
                      <span className={styles.taskTitle}>{task.title}</span>
                      {task.description && <p className={styles.taskDescription}>{task.description}</p>}
                      {task.labels.length > 0 && (
                        <div className={styles.labelRow}>
                          {task.labels.map((label, i) => (
                            <span
                              key={i}
                              className={styles.label}
                              style={{ backgroundColor: label.color }}
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {tasks.length === 0 && (
                  <div className={styles.emptyPlaceholder}>No tasks</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
