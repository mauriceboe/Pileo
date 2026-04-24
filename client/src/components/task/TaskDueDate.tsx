import { useRef } from 'react';
import { Calendar, X } from 'lucide-react';
import { format, isPast, isToday, formatDistanceToNow } from 'date-fns';
import { useBoardStore } from '../../stores/board.store';
import styles from './task-due-date.module.css';

interface TaskDueDateProps {
  taskId: string;
  dueDate: Date | string | null;
  isCompleted?: boolean;
  isRejected?: boolean;
}

export function TaskDueDate({ taskId, dueDate, isCompleted, isRejected }: TaskDueDateProps) {
  const updateTask = useBoardStore((state) => state.updateTask);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsedDate = dueDate ? new Date(dueDate) : null;
  const isInactive = !!isCompleted || !!isRejected;
  const isOverdue = !isInactive && parsedDate && isPast(parsedDate) && !isToday(parsedDate);
  const isDueToday = !isInactive && parsedDate && isToday(parsedDate);

  const handleDateChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const newDate = value ? new Date(value) : null;
    await updateTask(taskId, { dueDate: newDate });
  };

  const handleClear = async (event: React.MouseEvent) => {
    event.stopPropagation();
    await updateTask(taskId, { dueDate: null });
  };

  const handleClick = () => {
    inputRef.current?.showPicker();
  };

  const displayClassName = [
    styles.display,
    isOverdue ? styles.overdue : '',
    isDueToday ? styles.dueToday : '',
  ]
    .filter(Boolean)
    .join(' ');

  const formatInputValue = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={displayClassName}
        onClick={handleClick}
      >
        <Calendar size={12} />
        {parsedDate ? (
          <>
            <span>
              {format(parsedDate, 'MMM d, yyyy')}
              {isDueToday && ' (today)'}
              {isOverdue && ` (${formatDistanceToNow(parsedDate, { addSuffix: true })})`}
            </span>
            <span
              role="button"
              tabIndex={0}
              className={styles.clearButton}
              onClick={handleClear}
              onKeyDown={(e) => { if (e.key === 'Enter') handleClear(e as unknown as React.MouseEvent); }}
              aria-label="Clear due date"
            >
              <X size={12} />
            </span>
          </>
        ) : (
          <span className={styles.placeholder}>Set due date</span>
        )}
      </button>
      <input
        ref={inputRef}
        type="date"
        className={styles.dateInput}
        value={parsedDate ? formatInputValue(parsedDate) : ''}
        onChange={handleDateChange}
        tabIndex={-1}
      />
    </div>
  );
}
