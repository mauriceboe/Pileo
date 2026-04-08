import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { isPast, isToday, format } from 'date-fns';
import { Calendar, MessageSquare, CheckSquare, Paperclip, Link, Pencil, Trash2, CheckCircle } from 'lucide-react';
import type { TaskWithRelations } from '../../api/tasks.api';
import { useBoardStore } from '../../stores/board.store';
import { useWebSocketStore } from '../../stores/websocket.store';
import { useAuthStore } from '../../stores/auth.store';
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

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } });

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

  const cardClassName = [
    styles.card,
    isDragging ? styles.dragging : '',
    isDragOverlay ? styles.dragOverlay : '',
  ].filter(Boolean).join(' ');

  const handleClick = () => { if (!isDragging) openTaskDetail(task.id); };

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
  if (isOverdue && !taskCompleted) {
    banners.push({ text: 'Overdue', className: styles.bannerOverdue! });
  }
  if (isDueToday && !isOverdue && !taskCompleted) {
    banners.push({ text: 'Due today', className: styles.bannerDueToday! });
  }
  if (hasPriority && !taskCompleted) {
    const labels: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
    const cls: Record<string, string> = { low: styles.bannerPrioLow ?? '', medium: styles.bannerPrioMedium ?? '', high: styles.bannerPrioHigh ?? '', urgent: styles.bannerPrioUrgent ?? '' };
    banners.push({ text: labels[task.priority] ?? '', className: cls[task.priority] ?? '' });
  }

  const hasChecklist = (task.checklistTotal ?? 0) > 0;
  const hasComments = (task.commentCount ?? 0) > 0;
  const hasAttachments = (task.attachmentCount ?? 0) > 0;
  const hasLinks = (task.linkCount ?? 0) > 0;
  const hasLabels = (task.labels?.length ?? 0) > 0;
  const hasMeta = parsedDueDate || hasChecklist || hasComments || hasAttachments || hasLinks || hasLabels;

  return (
    <div ref={setNodeRef} style={style} className={cardClassName} onClick={handleClick} onContextMenu={handleContextMenu} {...attributes} {...listeners}>
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
          <Avatar name={task.assignees[0]!.displayName} src={task.assignees[0]!.avatarPath} size="sm" className={styles.avatar} />
        </div>
      )}

      <h4 className={styles.title}>{task.title}</h4>

      {task.description && <p className={styles.description}>{task.description}</p>}

      {hasMeta && (
        <div className={styles.meta}>
          <div className={styles.metaLeft}>
            {parsedDueDate && (
              <span className={`${styles.metaItem} ${isOverdue && !taskCompleted ? styles.metaOverdue : ''}`}>
                <Calendar size={11} /> {format(parsedDueDate, 'MMM d, yyyy')}
              </span>
            )}
            {hasComments && <span className={styles.metaItem}><MessageSquare size={11} /> {task.commentCount}</span>}
            {hasChecklist && (
              <span className={`${styles.metaItem} ${task.checklistCompleted === task.checklistTotal ? styles.metaDone : ''}`}>
                <CheckSquare size={11} /> {task.checklistCompleted}/{task.checklistTotal}
              </span>
            )}
            {hasAttachments && <span className={styles.metaItem}><Paperclip size={11} /> {task.attachmentCount}</span>}
            {hasLinks && <span className={styles.metaItem}><Link size={11} /> {task.linkCount}</span>}
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
