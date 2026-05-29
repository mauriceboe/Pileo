import { CheckCircle2, ListChecks, Calendar } from 'lucide-react';
import { isPast, isToday, format } from 'date-fns';
import type { UserTask } from '../../api/stats.api';
import styles from '../../pages/dashboard-page.module.css';

interface TaskItemProps {
  task: UserTask;
  onClick: (task: UserTask) => void;
}

export function TaskItem({ task, onClick }: TaskItemProps) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = !!(dueDate && !task.completedAt && isPast(dueDate) && !isToday(dueDate));

  return (
    <button
      className={`${styles.notifCard} ${task.completedAt ? styles.taskCompleted : ''}`}
      onClick={() => onClick(task)}
    >
      <div
        className={styles.notifIcon}
        style={{ background: task.columnColor, boxShadow: `0 2px 8px ${task.columnColor}44` }}
      >
        {task.completedAt ? <CheckCircle2 size={16} /> : <ListChecks size={16} />}
      </div>
      <div className={styles.notifBody}>
        <span className={styles.notifTime}>{task.boardName} · {task.columnName}</span>
        <span className={styles.notifTitle}>
          <span className={styles.notifTitleBold}>{task.title}</span>
        </span>
        {(dueDate || task.priority !== 'none') && (
          <div className={styles.notifMessage}>
            {dueDate && (
              <span className={isOverdue ? styles.taskOverdue : ''}>
                <Calendar size={11} /> {format(dueDate, 'MMM d, yyyy')}
                {isOverdue && ' · Overdue'}
              </span>
            )}
            {task.priority !== 'none' && <span> · Priority: {task.priority}</span>}
          </div>
        )}
      </div>
    </button>
  );
}
