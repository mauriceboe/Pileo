import { Calendar, MessageSquare, CheckSquare, Paperclip } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import styles from './task-card-meta.module.css';

interface TaskCardMetaProps {
  dueDate: Date | string | null;
  commentCount: number;
  checklistTotal: number;
  checklistCompleted: number;
  attachmentCount: number;
}

export function TaskCardMeta({
  dueDate,
  commentCount,
  checklistTotal,
  checklistCompleted,
  attachmentCount,
}: TaskCardMetaProps) {
  const hasAnything = dueDate || commentCount > 0 || checklistTotal > 0 || attachmentCount > 0;
  if (!hasAnything) return null;

  const parsedDueDate = dueDate ? new Date(dueDate) : null;
  const isOverdue = parsedDueDate && isPast(parsedDueDate) && !isToday(parsedDueDate);
  const isDueToday = parsedDueDate && isToday(parsedDueDate);
  const isAllComplete = checklistTotal > 0 && checklistCompleted === checklistTotal;

  const dueBadgeClassName = [
    styles.item,
    isOverdue ? styles.overdue : '',
    isDueToday ? styles.dueToday : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.meta}>
      {parsedDueDate && (
        <span className={dueBadgeClassName}>
          <Calendar size={11} />
          {format(parsedDueDate, 'MMM d, yyyy')}
        </span>
      )}

      {commentCount > 0 && (
        <span className={styles.item}>
          <MessageSquare size={11} />
          {commentCount}
        </span>
      )}

      {checklistTotal > 0 && (
        <span className={`${styles.item} ${isAllComplete ? styles.checklistDone : ''}`}>
          <CheckSquare size={11} />
          {checklistCompleted}/{checklistTotal}
        </span>
      )}

      {attachmentCount > 0 && (
        <span className={styles.item}>
          <Paperclip size={11} />
          {attachmentCount}
        </span>
      )}
    </div>
  );
}
