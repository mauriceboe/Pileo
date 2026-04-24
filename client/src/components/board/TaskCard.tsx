import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { isPast, isToday, format } from 'date-fns';
import { Calendar, MessageSquare, CheckSquare, Paperclip, Link, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import type { TaskWithRelations } from '../../api/tasks.api';
import { useBoardStore } from '../../stores/board.store';
import { useWebSocketStore } from '../../stores/websocket.store';
import { useAuthStore } from '../../stores/auth.store';
import { useSelectionStore } from '../../stores/selection.store';
import { Check } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { ContextMenu, type ContextMenuState } from '../ui/ContextMenu';
import styles from './task-card.module.css';

const FOCUS_COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4',
];
function getFocusColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return FOCUS_COLORS[Math.abs(hash) % FOCUS_COLORS.length]!;
}

// Keep only inline formatting tags; drop headings, blockquotes, code blocks, images, scripts, etc.
const INLINE_TAG_REGEX = /^(strong|b|em|i|u|s|del|ins|mark|code|sub|sup|br|span)$/i;
const BLOCK_TO_INLINE_OPEN = /<(p|div|li|h[1-6])\b[^>]*>/gi;
const BLOCK_TO_INLINE_CLOSE = /<\/(p|div|li|h[1-6])>/gi;
const LIST_TAG = /<\/?(ul|ol)\b[^>]*>/gi;
const ANY_OPEN_TAG = /<([a-z][a-z0-9-]*)\b[^>]*>/gi;
const ANY_CLOSE_TAG = /<\/([a-z][a-z0-9-]*)>/gi;

function sanitizePreviewHtml(html: string): string {
  if (!html) return '';
  let out = html
    .replace(BLOCK_TO_INLINE_OPEN, ' ')
    .replace(BLOCK_TO_INLINE_CLOSE, ' ')
    .replace(LIST_TAG, ' ');
  out = out
    .replace(ANY_OPEN_TAG, (match, tag) => (INLINE_TAG_REGEX.test(tag) ? match : ''))
    .replace(ANY_CLOSE_TAG, (match, tag) => (INLINE_TAG_REGEX.test(tag) ? match : ''));
  return out.replace(/\s+/g, ' ').trim();
}

interface TaskCardProps {
  task: TaskWithRelations;
  isDragOverlay?: boolean;
  isCompleted?: boolean;
}

export function TaskCard({ task, isDragOverlay }: TaskCardProps) {
  const openTaskDetail = useBoardStore((state) => state.openTaskDetail);
  const updateTask = useBoardStore((state) => state.updateTask);
  const deleteTask = useBoardStore((state) => state.deleteTask);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const taskFocus = useWebSocketStore((s) => s.taskFocus);
  const presenceUsers = useWebSocketStore((s) => s.presenceUsers);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const selectionActiveColumnId = useSelectionStore((s) => s.activeColumnId);
  const selectedTaskIds = useSelectionStore((s) => s.selectedTaskIds);
  const toggleSelection = useSelectionStore((s) => s.toggleTask);
  const selectionMode = selectionActiveColumnId === task.columnId;
  const isSelected = selectionMode && selectedTaskIds.has(task.id);

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task },
    disabled: selectionMode,
  });

  let focusedByUser: { userId: string; name: string; color: string } | null = null;
  for (const [userId, focusedTaskId] of taskFocus) {
    if (focusedTaskId === task.id && userId !== currentUserId) {
      const user = presenceUsers.find((u) => u.userId === userId);
      focusedByUser = {
        userId,
        name: user?.displayName || user?.username || '?',
        color: getFocusColor(userId),
      };
      break;
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(focusedByUser ? { outline: `2px solid ${focusedByUser.color}`, outlineOffset: '1px' } : {}),
  };

  const parsedDueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = parsedDueDate && isPast(parsedDueDate) && !isToday(parsedDueDate);
  const isDueToday = parsedDueDate && isToday(parsedDueDate);
  const hasPriority = task.priority && task.priority !== 'none';
  const taskCompleted = !!task.completedAt;
  const taskRejected = !!(task as any).rejectedAt;

  const cardClassName = [
    styles.card,
    isDragging ? styles.dragging : '',
    isDragOverlay ? styles.dragOverlay : '',
    selectionMode ? styles.selectionMode : '',
    isSelected ? styles.selected : '',
  ].filter(Boolean).join(' ');

  const handleClick = (event: React.MouseEvent) => {
    if (selectionMode) {
      event.stopPropagation();
      toggleSelection(task.id);
      return;
    }
    if (!isDragging) openTaskDetail(task.id);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setCtxMenu({ x: event.clientX, y: event.clientY });
  };

  // Banners — all shown as pills
  const banners: Array<{ text: string; className: string }> = [];
  if (taskCompleted) {
    banners.push({ text: 'Completed', className: styles.bannerCompleted! });
  }
  if (taskRejected && !taskCompleted) {
    banners.push({ text: 'Rejected', className: styles.bannerRejected! });
  }
  if (isOverdue && !taskCompleted && !taskRejected) {
    banners.push({ text: 'Overdue', className: styles.bannerOverdue! });
  }
  if (isDueToday && !isOverdue && !taskCompleted && !taskRejected) {
    banners.push({ text: 'Due today', className: styles.bannerDueToday! });
  }
  if (hasPriority && !taskCompleted && !taskRejected) {
    const labels: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
    const cls: Record<string, string> = { low: styles.bannerPrioLow ?? '', medium: styles.bannerPrioMedium ?? '', high: styles.bannerPrioHigh ?? '', urgent: styles.bannerPrioUrgent ?? '' };
    banners.push({ text: labels[task.priority] ?? '', className: cls[task.priority] ?? '' });
  }

  const hasLabels = (task.labels?.length ?? 0) > 0;
  const hasCustomBadges = (task.customBadges?.length ?? 0) > 0;
  const tagCount = (task.labels?.length ?? 0) + (task.customBadges?.length ?? 0);

  // Tags take priority — progressively hide meta icons as tags increase
  // Remove: attachments first, then links, comments, checklist, date
  const hasAttachments = tagCount < 2 && (task.attachmentCount ?? 0) > 0;
  const hasLinks = tagCount < 2 && (task.linkCount ?? 0) > 0;
  const hasComments = tagCount < 3 && (task.commentCount ?? 0) > 0;
  const hasChecklist = tagCount < 3 && (task.checklistTotal ?? 0) > 0;
  const showDueDate = tagCount < 4 && !!parsedDueDate;

  const hasMeta = showDueDate || hasChecklist || hasComments || hasAttachments || hasLinks || hasLabels;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClassName}
      onClick={handleClick}
      onContextMenu={selectionMode ? undefined : handleContextMenu}
      {...(selectionMode ? {} : attributes)}
      {...(selectionMode ? {} : listeners)}
    >
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          items={[
            {
              label: 'Edit',
              icon: <Pencil size={14} />,
              onClick: () => openTaskDetail(task.id),
            },
            {
              label: taskCompleted ? 'Mark incomplete' : 'Mark completed',
              icon: <CheckCircle size={14} />,
              onClick: () => updateTask(task.id, {
                completedAt: taskCompleted ? null : new Date(),
              }),
            },
            {
              label: taskRejected ? 'Undo rejected' : 'Mark rejected',
              icon: <XCircle size={14} />,
              onClick: () => updateTask(task.id, {
                rejectedAt: taskRejected ? null : new Date(),
              } as any),
            },
            'divider',
            {
              label: 'Delete',
              icon: <Trash2 size={14} />,
              danger: true,
              onClick: () => {
                if (window.confirm(`Delete task "${task.title}"?`)) {
                  deleteTask(task.id);
                }
              },
            },
          ]}
        />
      )}
      {selectionMode && (
        <span className={`${styles.selectCheckbox} ${isSelected ? styles.selectCheckboxOn : ''}`} aria-hidden>
          {isSelected && <Check size={12} strokeWidth={3} />}
        </span>
      )}
      {/* Focus name tag — absolute top right */}
      {focusedByUser && (
        <span className={styles.focusTag} style={{ backgroundColor: focusedByUser.color }}>
          {focusedByUser.name}
        </span>
      )}

      {banners.length > 0 && (
        <div className={styles.bannerRow}>
          {banners.map((b, i) => (
            <span key={i} className={`${styles.bannerPill} ${b.className}`}>{b.text}</span>
          ))}
        </div>
      )}

      {task.assignees?.length > 0 && (
        <div className={styles.avatarTopRight}>
          <div className={styles.avatarTooltipWrap}>
            <Avatar name={task.assignees[0]!.displayName} src={task.assignees[0]!.avatarPath} size="sm" className={styles.avatar} />
            <span className={styles.avatarTooltip} role="tooltip">
              {task.assignees[0]!.displayName}
            </span>
          </div>
        </div>
      )}

      <h4 className={styles.title}>{task.title}</h4>

      {task.description && (
        <p
          className={styles.description}
          dangerouslySetInnerHTML={{ __html: sanitizePreviewHtml(task.description) }}
        />
      )}

      {hasCustomBadges && (
        <div className={styles.customBadges}>
          {task.customBadges!.map((badge, i) => (
            <span key={i} className={styles.customBadge}>
              <span className={styles.customBadgeLabel}>{badge.fieldName}</span>
              <span className={styles.customBadgeValue}>{badge.value}</span>
            </span>
          ))}
        </div>
      )}

      {hasMeta && (
        <div className={styles.meta}>
          <div className={styles.metaLeft}>
            {showDueDate && (
              <span className={`${styles.metaItem} ${isOverdue && !taskCompleted && !taskRejected ? styles.metaOverdue : ''}`}>
                <Calendar size={11} /> {format(parsedDueDate!, 'MMM d, yyyy')}
              </span>
            )}
            {hasChecklist && (
              <span className={`${styles.metaItem} ${task.checklistCompleted === task.checklistTotal ? styles.metaDone : ''}`}>
                <CheckSquare size={11} /> {task.checklistCompleted}/{task.checklistTotal}
              </span>
            )}
            {hasComments && <span className={styles.metaItem}><MessageSquare size={11} /> {task.commentCount}</span>}
            {hasLinks && <span className={styles.metaItem}><Link size={11} /> {task.linkCount}</span>}
            {hasAttachments && <span className={styles.metaItem}><Paperclip size={11} /> {task.attachmentCount}</span>}
          </div>
          {hasLabels && (
            <div className={styles.metaRight}>
              {task.labels!.map((label) => (
                <Badge key={(label as any).labelId ?? label.id} color={label.color}>{label.name}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
