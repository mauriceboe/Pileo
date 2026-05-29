import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Star, Zap, Rocket, Target, Flag, Heart, Coffee, Sun,
  Moon, Cloud, Flame, Music, Camera, Gift, Award, Bookmark,
  Bell, Globe, Lightbulb, Shield, Check, CheckCircle,
  Clock, Eye, Home, Inbox, Layers, Mail, Map, Megaphone,
  Palette, Pencil, Play, Search, Send, Settings, Smile,
  Sparkles, ThumbsUp, TrendingUp, Upload, Users,
} from 'lucide-react';
import { useSharedBoard } from '../hooks/useSharedBoard';
import { useHorizontalWheelScroll } from '../hooks/useHorizontalWheelScroll';
import styles from './shared-board-page.module.css';

const ICON_MAP: Record<string, LucideIcon> = {
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

interface SharedTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  labels: Array<{ name: string; color: string }>;
}

function getTaskBanners(task: SharedTask): Array<{ text: string; cls: string }> {
  const completed = !!task.completedAt;
  const rejected = !!task.rejectedAt;
  const inactive = completed || rejected;
  const parsed = task.dueDate ? new Date(task.dueDate) : null;
  const now = new Date();
  const isOverdue = parsed && !inactive && parsed < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isDueToday = parsed && !inactive && parsed.toDateString() === now.toDateString();
  const hasPrio = task.priority && task.priority !== 'none' && !inactive;

  const banners: Array<{ text: string; cls: string }> = [];
  if (completed) banners.push({ text: 'Completed', cls: styles.bannerCompleted! });
  if (rejected && !completed) banners.push({ text: 'Rejected', cls: styles.bannerRejected! });
  if (isOverdue) banners.push({ text: 'Overdue', cls: styles.bannerOverdue! });
  if (isDueToday && !isOverdue) banners.push({ text: 'Due today', cls: styles.bannerDueToday! });
  if (hasPrio) {
    const labels: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
    const cls: Record<string, string> = {
      low: styles.bannerPrioLow!, medium: styles.bannerPrioMedium!,
      high: styles.bannerPrioHigh!, urgent: styles.bannerPrioUrgent!,
    };
    banners.push({ text: labels[task.priority] ?? '', cls: cls[task.priority] ?? '' });
  }
  return banners;
}

function TaskCard({ task }: { task: SharedTask }) {
  const banners = getTaskBanners(task);
  return (
    <div className={styles.taskCard}>
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
}

export function SharedBoardPage() {
  const { token } = useParams<{ token: string }>();
  const { data, error, viewerCount } = useSharedBoard(token);
  const boardRef = useRef<HTMLDivElement>(null);
  useHorizontalWheelScroll(boardRef, `.${styles.taskArea}`, [data]);

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
                {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
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
