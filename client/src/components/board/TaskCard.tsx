import { useState, type MouseEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import type { TaskWithRelations } from '@pileo/shared';
import { useBoardStore } from '../../stores/board.store';
import { useSelectionStore } from '../../stores/selection.store';
import { useTaskFocus } from '../../hooks/useTaskFocus';
import { sanitizePreviewHtml } from '../../utils/sanitize-html';
import { Avatar } from '../ui/Avatar';
import { ContextMenu, type ContextMenuState } from '../ui/ContextMenu';
import { TaskCardBanners } from './TaskCardBanners';
import { TaskCardMeta } from './TaskCardMeta';
import styles from './task-card.module.css';

interface TaskCardProps {
  task: TaskWithRelations;
  isDragOverlay?: boolean;
}

export function TaskCard({ task, isDragOverlay }: TaskCardProps) {
  const openTaskDetail = useBoardStore((s) => s.openTaskDetail);
  const updateTask = useBoardStore((s) => s.updateTask);
  const deleteTask = useBoardStore((s) => s.deleteTask);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);

  const selectionActiveColumnId = useSelectionStore((s) => s.activeColumnId);
  const selectedTaskIds = useSelectionStore((s) => s.selectedTaskIds);
  const toggleSelection = useSelectionStore((s) => s.toggleTask);
  const selectionMode = selectionActiveColumnId === task.columnId;
  const isSelected = selectionMode && selectedTaskIds.has(task.id);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
    disabled: selectionMode,
  });

  const focusedByUser = useTaskFocus(task.id);
  const taskCompleted = !!task.completedAt;
  const taskRejected = !!task.rejectedAt;
  const hasCustomBadges = (task.customBadges?.length ?? 0) > 0;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(focusedByUser ? { outline: `2px solid ${focusedByUser.color}`, outlineOffset: '1px' } : {}),
  };

  const cardClassName = [
    styles.card,
    isDragging ? styles.dragging : '',
    isDragOverlay ? styles.dragOverlay : '',
    selectionMode ? styles.selectionMode : '',
    isSelected ? styles.selected : '',
  ].filter(Boolean).join(' ');

  const handleClick = (event: MouseEvent) => {
    if (selectionMode) {
      event.stopPropagation();
      toggleSelection(task.id);
      return;
    }
    if (!isDragging) openTaskDetail(task.id);
  };

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setCtxMenu({ x: event.clientX, y: event.clientY });
  };

  const menuItems = [
    { label: 'Edit', icon: <Pencil size={14} />, onClick: () => openTaskDetail(task.id) },
    {
      label: taskCompleted ? 'Mark incomplete' : 'Mark completed',
      icon: <CheckCircle size={14} />,
      onClick: () => updateTask(task.id, { completedAt: taskCompleted ? null : new Date() }),
    },
    {
      label: taskRejected ? 'Undo rejected' : 'Mark rejected',
      icon: <XCircle size={14} />,
      onClick: () => updateTask(task.id, { rejectedAt: taskRejected ? null : new Date() }),
    },
    'divider' as const,
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => {
        if (window.confirm(`Delete task "${task.title}"?`)) deleteTask(task.id);
      },
    },
  ];

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
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)} items={menuItems} />
      )}

      {focusedByUser && (
        <span className={styles.focusTag} style={{ backgroundColor: focusedByUser.color }}>
          {focusedByUser.name}
        </span>
      )}

      <TaskCardBanners task={task} />

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

      <TaskCardMeta task={task} />
    </div>
  );
}
