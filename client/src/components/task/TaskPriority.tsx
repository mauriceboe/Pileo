import { useState, useRef, useEffect } from 'react';
import { Flag } from 'lucide-react';
import type { TaskPriority as TaskPriorityType } from '@pileo/shared';
import { TASK_PRIORITIES } from '@pileo/shared';
import { useBoardStore } from '../../stores/board.store';
import styles from './task-priority.module.css';

interface TaskPriorityProps {
  taskId: string;
  priority: TaskPriorityType;
}

const PRIORITY_COLORS: Record<TaskPriorityType, string> = {
  none: '#ADB5BD',
  low: '#4A90D9',
  medium: '#F5A623',
  high: '#F5735A',
  urgent: '#E74C3C',
};

const PRIORITY_LABELS: Record<TaskPriorityType, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

function getPriorityStyle(value: TaskPriorityType): string {
  switch (value) {
    case 'none': return styles.priorityNone ?? '';
    case 'low': return styles.priorityLow ?? '';
    case 'medium': return styles.priorityMedium ?? '';
    case 'high': return styles.priorityHigh ?? '';
    case 'urgent': return styles.priorityUrgent ?? '';
  }
}

export function TaskPriority({ taskId, priority }: TaskPriorityProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const updateTask = useBoardStore((state) => state.updateTask);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = async (value: TaskPriorityType) => {
    setIsOpen(false);
    if (value === priority) return;
    await updateTask(taskId, { priority: value });
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={`${styles.trigger} ${getPriorityStyle(priority)}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Flag size={12} />
        {PRIORITY_LABELS[priority]}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {TASK_PRIORITIES.map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.option} ${value === priority ? styles.active : ''}`}
              onClick={() => handleSelect(value)}
            >
              <span
                className={styles.dot}
                style={{ backgroundColor: PRIORITY_COLORS[value] }}
              />
              {PRIORITY_LABELS[value]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
