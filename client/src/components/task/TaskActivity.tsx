import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  ArrowRight, Flag, Calendar, CheckCircle2, XCircle, Tag, UserPlus, UserMinus,
  MessageSquare, Paperclip, Link as LinkIcon, CheckSquare, Square, Edit3,
  AlignLeft, Hash,
  Star, Zap, Rocket, Target, Heart, Coffee, Sun, Moon, Cloud, Flame, Music,
  Camera, Gift, Award, Bookmark, Bell, Globe, Lightbulb, Shield, Check,
  Clock, Eye, Home, Inbox, Layers, Mail, Map, Megaphone, Palette, Pencil,
  Play, Search, Send, Settings, Smile, Sparkles, ThumbsUp, TrendingUp, Upload,
  Users,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { apiClient } from '../../api/client';
import { useBoardStore } from '../../stores/board.store';
import type { ApiSuccessResponse } from '@pileo/shared';
import styles from './task-activity.module.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = {
  check: Check, checkCircle: CheckCircle2, star: Star, heart: Heart,
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

interface ActivityEntry {
  id: string;
  projectId: string;
  taskId: string | null;
  userId: string;
  action: string;
  details: string | null;
  createdAt: string;
  userDisplayName: string;
  userAvatarPath: string | null;
}

interface TaskActivityProps {
  taskId: string;
}

interface Change<T = unknown> {
  oldValue: T;
  newValue: T;
}

interface DescribedAction {
  text: ReactNode | null;
  preview?: { label: string; content: string; icon?: ReactNode };
  diff?: { oldText: string; newText: string; icon?: ReactNode };
}

type DiffPart = { type: 'same' | 'added' | 'removed'; text: string };

function diffWords(oldStr: string, newStr: string): DiffPart[] {
  const oldTokens = oldStr.split(/(\s+)/);
  const newTokens = newStr.split(/(\s+)/);
  const m = oldTokens.length;
  const n = newTokens.length;

  // Cap to keep LCS fast in extreme cases
  if (m * n > 200000) {
    return [
      { type: 'removed', text: oldStr },
      { type: 'added', text: newStr },
    ];
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (oldTokens[i - 1] === newTokens[j - 1]) dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      else dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }

  const parts: DiffPart[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (oldTokens[i - 1] === newTokens[j - 1]) {
      parts.unshift({ type: 'same', text: oldTokens[i - 1]! });
      i -= 1;
      j -= 1;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      parts.unshift({ type: 'removed', text: oldTokens[i - 1]! });
      i -= 1;
    } else {
      parts.unshift({ type: 'added', text: newTokens[j - 1]! });
      j -= 1;
    }
  }
  while (i > 0) {
    i -= 1;
    parts.unshift({ type: 'removed', text: oldTokens[i]! });
  }
  while (j > 0) {
    j -= 1;
    parts.unshift({ type: 'added', text: newTokens[j]! });
  }

  // Merge adjacent parts of the same type
  const merged: DiffPart[] = [];
  for (const part of parts) {
    const last = merged[merged.length - 1];
    if (last && last.type === part.type) {
      last.text += part.text;
    } else {
      merged.push({ ...part });
    }
  }
  return merged;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function truncate(value: string, max = 60): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function stripHtmlText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function ColumnBadge({ name, color, icon }: { name: string; color?: string | null; icon?: string | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon: any = icon ? ICON_MAP[icon] : null;
  const bg = color ?? '#6B7280';
  return (
    <span className={styles.badge} style={{ backgroundColor: bg }}>
      {Icon ? <Icon size={11} /> : <span className={styles.badgeDot} />}
      <span className={styles.badgeLabel}>{name}</span>
    </span>
  );
}

function LabelBadge({ name, color }: { name: string; color?: string }) {
  const bg = color ?? '#6B7280';
  return (
    <span className={styles.badge} style={{ backgroundColor: bg }}>
      <Tag size={11} />
      <span className={styles.badgeLabel}>{name}</span>
    </span>
  );
}

function PriorityBadge({ value }: { value: string }) {
  const palette: Record<string, string> = {
    none: '#9CA3AF',
    low: '#3B82F6',
    medium: '#F59E0B',
    high: '#F97316',
    urgent: '#EF4444',
  };
  const bg = palette[value] ?? '#9CA3AF';
  return (
    <span className={styles.badge} style={{ backgroundColor: bg }}>
      <Flag size={11} />
      <span className={styles.badgeLabel}>{value}</span>
    </span>
  );
}

function MetaBadge({ icon, label, tone }: { icon: ReactNode; label: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const palette: Record<string, string> = {
    neutral: '#6B7280',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#9CA3AF',
  };
  const bg = palette[tone ?? 'neutral'];
  return (
    <span className={styles.badge} style={{ backgroundColor: bg }}>
      {icon}
      <span className={styles.badgeLabel}>{label}</span>
    </span>
  );
}

function describeAction(action: string, details: string | null): DescribedAction {
  const parsed = details ? JSON.parse(details) as Record<string, unknown> : null;

  switch (action) {
    case 'task.created':
      return { text: <>created this task</> };

    case 'task.updated': {
      if (!parsed) return { text: <>updated this task</> };
      const parts: ReactNode[] = [];
      let diff: DescribedAction['diff'];

      if (parsed.title) {
        const change = parsed.title as Change<string>;
        parts.push(<>renamed to <strong className={styles.strongValue}>{truncate(change.newValue ?? '', 60)}</strong></>);
      }
      if (parsed.description) {
        const change = parsed.description as Change<string>;
        const oldText = stripHtmlText(change.oldValue ?? '');
        const newText = stripHtmlText(change.newValue ?? '');
        if (newText || oldText) {
          parts.push(<>updated the description</>);
          diff = { oldText, newText, icon: <AlignLeft size={12} /> };
        } else {
          parts.push(<>cleared the description</>);
        }
      }
      if (parsed.priority) {
        const change = parsed.priority as Change<string>;
        parts.push(
          <>set priority <PriorityBadge value={change.oldValue ?? 'none'} /> <ArrowRight size={12} className={styles.inlineArrow} /> <PriorityBadge value={change.newValue ?? 'none'} /></>,
        );
      }
      if (parsed.dueDate) {
        const change = parsed.dueDate as Change<string | null>;
        const newDate = formatDate(change.newValue);
        const oldDate = formatDate(change.oldValue);
        if (newDate && oldDate) {
          parts.push(
            <>due date <MetaBadge icon={<Calendar size={11} />} label={oldDate} /> <ArrowRight size={12} className={styles.inlineArrow} /> <MetaBadge icon={<Calendar size={11} />} label={newDate} /></>,
          );
        } else if (newDate) {
          parts.push(<>set due date to <MetaBadge icon={<Calendar size={11} />} label={newDate} /></>);
        } else {
          parts.push(<>removed the due date</>);
        }
      }
      if (parsed.completedAt) {
        const change = parsed.completedAt as Change<string | null>;
        parts.push(change.newValue
          ? <>marked as <MetaBadge icon={<CheckCircle2 size={11} />} label="completed" tone="success" /></>
          : <>unmarked <MetaBadge icon={<CheckCircle2 size={11} />} label="completed" /></>);
      }
      if (parsed.rejectedAt) {
        const change = parsed.rejectedAt as Change<string | null>;
        parts.push(change.newValue
          ? <>marked as <MetaBadge icon={<XCircle size={11} />} label="rejected" tone="danger" /></>
          : <>unmarked <MetaBadge icon={<XCircle size={11} />} label="rejected" /></>);
      }

      if (parts.length === 0) return { text: <>updated this task</> };
      return {
        text: <>{parts.map((p, i) => <span key={i} className={styles.part}>{i > 0 ? ' · ' : ''}{p}</span>)}</>,
        diff,
      };
    }

    case 'task.moved': {
      if (!parsed) return { text: <>moved this task</> };
      if (parsed.oldColumn && parsed.newColumn) {
        return {
          text: (
            <>
              moved{' '}
              <ColumnBadge
                name={String(parsed.oldColumn)}
                color={parsed.oldColumnColor as string | undefined}
                icon={parsed.oldColumnIcon as string | undefined}
              />
              <ArrowRight size={12} className={styles.inlineArrow} />
              <ColumnBadge
                name={String(parsed.newColumn)}
                color={parsed.newColumnColor as string | undefined}
                icon={parsed.newColumnIcon as string | undefined}
              />
            </>
          ),
        };
      }
      if (parsed.column && parsed.oldPosition !== undefined && parsed.newPosition !== undefined) {
        return {
          text: (
            <>
              reordered in{' '}
              <ColumnBadge
                name={String(parsed.column)}
                color={parsed.columnColor as string | undefined}
                icon={parsed.columnIcon as string | undefined}
              />
              {' '}#{Number(parsed.oldPosition) + 1} → #{Number(parsed.newPosition) + 1}
            </>
          ),
        };
      }
      return { text: <>reordered this task</> };
    }

    case 'task.bulk_moved': {
      const count = Number(parsed?.count ?? 0);
      return { text: <>moved <strong>{count}</strong> task{count === 1 ? '' : 's'} into this column</> };
    }

    case 'task.deleted':
      return {
        text: parsed?.title
          ? <>deleted <strong className={styles.strongValue}>{truncate(String(parsed.title), 50)}</strong></>
          : <>deleted a task</>,
      };

    case 'task.assignees.updated': {
      const addedNames = (parsed?.addedNames as string[] | undefined) ?? [];
      const removedNames = (parsed?.removedNames as string[] | undefined) ?? [];
      const parts: ReactNode[] = [];
      if (addedNames.length > 0) {
        parts.push(
          <>
            assigned{' '}
            {addedNames.map((n, i) => (
              <span key={`a-${i}`}>
                <MetaBadge icon={<UserPlus size={11} />} label={`@${n}`} tone="success" />
                {i < addedNames.length - 1 ? ' ' : ''}
              </span>
            ))}
          </>,
        );
      }
      if (removedNames.length > 0) {
        parts.push(
          <>
            unassigned{' '}
            {removedNames.map((n, i) => (
              <span key={`r-${i}`}>
                <MetaBadge icon={<UserMinus size={11} />} label={`@${n}`} />
                {i < removedNames.length - 1 ? ' ' : ''}
              </span>
            ))}
          </>,
        );
      }
      return {
        text: parts.length > 0
          ? <>{parts.map((p, i) => <span key={i} className={styles.part}>{i > 0 ? ' · ' : ''}{p}</span>)}</>
          : <>updated assignees</>,
      };
    }

    case 'task.labels.updated': {
      const added = (parsed?.addedLabels as Array<{ name: string; color: string }> | undefined) ?? [];
      const removed = (parsed?.removedLabels as Array<{ name: string; color: string }> | undefined) ?? [];
      const parts: ReactNode[] = [];
      if (added.length > 0) {
        parts.push(
          <>
            added{' '}
            {added.map((l, i) => (
              <span key={`la-${i}`}>
                <LabelBadge name={l.name} color={l.color} />
                {i < added.length - 1 ? ' ' : ''}
              </span>
            ))}
          </>,
        );
      }
      if (removed.length > 0) {
        parts.push(
          <>
            removed{' '}
            {removed.map((l, i) => (
              <span key={`lr-${i}`}>
                <LabelBadge name={l.name} color={l.color} />
                {i < removed.length - 1 ? ' ' : ''}
              </span>
            ))}
          </>,
        );
      }
      return {
        text: parts.length > 0
          ? <>{parts.map((p, i) => <span key={i} className={styles.part}>{i > 0 ? ' · ' : ''}{p}</span>)}</>
          : <>updated labels</>,
      };
    }

    case 'comment.created': {
      const content = parsed?.content ?? parsed?.preview ?? parsed?.body;
      if (content) {
        return {
          text: null,
          preview: { label: 'Comment', content: stripHtmlText(String(content)), icon: <MessageSquare size={12} /> },
        };
      }
      return { text: <>added a comment</> };
    }
    case 'comment.updated':
      return { text: <>edited a comment</> };
    case 'comment.deleted':
      return { text: <>deleted a comment</> };

    case 'attachment.uploaded':
      return {
        text: parsed?.fileName
          ? <>uploaded <MetaBadge icon={<Paperclip size={11} />} label={truncate(String(parsed.fileName), 40)} /></>
          : <>uploaded a file</>,
      };
    case 'attachment.deleted':
      return {
        text: parsed?.fileName
          ? <>removed <MetaBadge icon={<Paperclip size={11} />} label={truncate(String(parsed.fileName), 40)} /></>
          : <>removed a file</>,
      };

    case 'link.created':
      return {
        text: parsed?.url
          ? <>added link <MetaBadge icon={<LinkIcon size={11} />} label={truncate(String(parsed.url), 50)} /></>
          : <>added a link</>,
      };
    case 'link.deleted':
      return { text: <>removed a link</> };

    case 'checklist.created':
      return {
        text: parsed?.title
          ? <>added item <MetaBadge icon={<Square size={11} />} label={truncate(String(parsed.title), 40)} /></>
          : <>added a checklist item</>,
      };
    case 'checklist.updated':
      if (parsed?.isCompleted !== undefined) {
        return {
          text: parsed.isCompleted
            ? <><CheckSquare size={12} className={styles.inlineIcon} /> completed a checklist item</>
            : <><Square size={12} className={styles.inlineIcon} /> unchecked a checklist item</>,
        };
      }
      return { text: <><Edit3 size={12} className={styles.inlineIcon} /> edited a checklist item</> };
    case 'checklist.deleted':
      return { text: <>removed a checklist item</> };

    default:
      return { text: <><Hash size={12} className={styles.inlineIcon} /> {action.replace(/\./g, ' ')}</> };
  }
}

const INITIAL_LIMIT = 15;

export function TaskActivity({ taskId }: TaskActivityProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Refresh activity whenever the task itself changes (title/description/assignees/etc.)
  const taskUpdatedAt = useBoardStore((state) => state.selectedTask?.updatedAt);

  const fetchActivity = useCallback(async () => {
    try {
      const response = await apiClient.get<ApiSuccessResponse<ActivityEntry[]>>(
        `/tasks/${taskId}/activity`,
      );
      setEntries(response.data);
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity, taskUpdatedAt]);

  if (isLoading) return null;

  if (entries.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.emptyMessage}>No activity yet</p>
      </div>
    );
  }

  const visibleEntries = expanded ? entries : entries.slice(0, INITIAL_LIMIT);
  const hiddenCount = entries.length - visibleEntries.length;

  return (
    <div className={styles.container}>
      <div className={styles.timeline}>
        {visibleEntries.map((entry) => {
          const described = describeAction(entry.action, entry.details);
          return (
            <div key={entry.id} className={styles.entry}>
              <div className={styles.entryAvatar}>
                <Avatar
                  name={entry.userDisplayName}
                  src={entry.userAvatarPath}
                  size="sm"
                />
              </div>
              <div className={styles.entryContent}>
                {described.text !== null ? (
                  <div className={styles.entryText}>
                    <span className={styles.entryUser}>{entry.userDisplayName}</span>
                    {' '}
                    <span className={styles.entryAction}>{described.text}</span>
                  </div>
                ) : (
                  <div className={styles.entryText}>
                    <span className={styles.entryUser}>{entry.userDisplayName}</span>
                  </div>
                )}
                {described.preview && (
                  <div className={styles.previewBox}>
                    {described.preview.icon && (
                      <span className={styles.previewIcon}>{described.preview.icon}</span>
                    )}
                    <span className={styles.previewContent}>{described.preview.content}</span>
                  </div>
                )}
                {described.diff && (
                  <div className={styles.diffBox}>
                    {described.diff.icon && (
                      <span className={styles.previewIcon}>{described.diff.icon}</span>
                    )}
                    <span className={styles.diffContent}>
                      {diffWords(described.diff.oldText, described.diff.newText).map((part, i) => {
                        if (part.type === 'same') return <span key={i}>{part.text}</span>;
                        if (part.type === 'added') return <span key={i} className={styles.diffAdded}>{part.text}</span>;
                        return <span key={i} className={styles.diffRemoved}>{part.text}</span>;
                      })}
                    </span>
                  </div>
                )}
                <div className={styles.entryTimestamp}>
                  {formatTimestamp(entry.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {hiddenCount > 0 && (
        <button
          type="button"
          className={styles.expandButton}
          onClick={() => setExpanded(true)}
        >
          Show {hiddenCount} older {hiddenCount === 1 ? 'entry' : 'entries'}
        </button>
      )}
      {expanded && entries.length > INITIAL_LIMIT && (
        <button
          type="button"
          className={styles.expandButton}
          onClick={() => setExpanded(false)}
        >
          Collapse history
        </button>
      )}
    </div>
  );
}
