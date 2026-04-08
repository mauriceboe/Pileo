import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useBoardStore } from '../../stores/board.store';
import styles from './add-task-button.module.css';

interface AddTaskButtonProps {
  columnId: string;
  color?: string;
}

export function AddTaskButton({ columnId, color }: AddTaskButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createTask = useBoardStore((state) => state.createTask);
  const openTaskDetail = useBoardStore((state) => state.openTaskDetail);

  const handleClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const taskId = await createTask(columnId, 'Untitled');
      openTaskDetail(taskId);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.trigger}
        type="button"
        onClick={handleClick}
        disabled={isSubmitting}
        style={color ? { '--add-color': color } as React.CSSProperties : undefined}
      >
        <span className={styles.triggerIcon}>
          <Plus size={16} />
        </span>
      </button>
    </div>
  );
}
