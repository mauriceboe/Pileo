import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { useBoardStore } from '../../stores/board.store';
import { Button } from '../ui/Button';
import styles from './add-task-button.module.css';

interface AddTaskButtonProps {
  columnId: string;
  color?: string;
}

export function AddTaskButton({ columnId, color }: AddTaskButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useBoardStore((state) => state.createTask);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      await createTask(columnId, trimmed);
      setTitle('');
      inputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
    if (event.key === 'Escape') {
      setIsOpen(false);
      setTitle('');
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setTitle('');
  };

  if (!isOpen) {
    return (
      <div className={styles.container}>
        <button
          className={styles.trigger}
          type="button"
          onClick={() => setIsOpen(true)}
          style={color ? { '--add-color': color } as React.CSSProperties : undefined}
        >
          <span className={styles.triggerIcon}>
            <Plus size={16} />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <input
          ref={inputRef}
          className={styles.titleInput}
          type="text"
          placeholder="Task title..."
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
        />
        <div className={styles.formActions}>
          <Button
            size="sm"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!title.trim()}
          >
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            <X size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
