import { Calendar, MessageSquare, CheckSquare, Paperclip, Link } from 'lucide-react';
import { isPast, isToday, format } from 'date-fns';
import type { TaskWithRelations } from '@pileo/shared';
import { Badge } from '../ui/Badge';
import styles from './task-card.module.css';

export function TaskCardMeta({ task }: { task: TaskWithRelations }) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = due && isPast(due) && !isToday(due);
  const completed = !!task.completedAt;
  const rejected = !!task.rejectedAt;
  const inactive = completed || rejected;

  const labelCount = task.labels?.length ?? 0;
  const customCount = task.customBadges?.length ?? 0;
  const tagCount = labelCount + customCount;

  // Tags take priority; meta icons drop as tag density grows.
  const showAttachments = tagCount < 2 && (task.attachmentCount ?? 0) > 0;
  const showLinks = tagCount < 2 && (task.linkCount ?? 0) > 0;
  const showComments = tagCount < 3 && (task.commentCount ?? 0) > 0;
  const showChecklist = tagCount < 3 && (task.checklistTotal ?? 0) > 0;
  const showDue = tagCount < 4 && !!due;
  const showLabels = labelCount > 0;
  const hasAny = showDue || showChecklist || showComments || showLinks || showAttachments || showLabels;
  if (!hasAny) return null;

  return (
    <div className={styles.meta}>
      <div className={styles.metaLeft}>
        {showDue && (
          <span className={`${styles.metaItem} ${overdue && !inactive ? styles.metaOverdue : ''}`}>
            <Calendar size={11} /> {format(due!, 'MMM d, yyyy')}
          </span>
        )}
        {showChecklist && (
          <span className={`${styles.metaItem} ${task.checklistCompleted === task.checklistTotal ? styles.metaDone : ''}`}>
            <CheckSquare size={11} /> {task.checklistCompleted}/{task.checklistTotal}
          </span>
        )}
        {showComments && <span className={styles.metaItem}><MessageSquare size={11} /> {task.commentCount}</span>}
        {showLinks && <span className={styles.metaItem}><Link size={11} /> {task.linkCount}</span>}
        {showAttachments && <span className={styles.metaItem}><Paperclip size={11} /> {task.attachmentCount}</span>}
      </div>
      {showLabels && (
        <div className={styles.metaRight}>
          {task.labels.map((label) => (
            <Badge key={label.labelId} color={label.color}>{label.name}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
