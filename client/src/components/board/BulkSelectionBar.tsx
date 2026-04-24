import { useState } from 'react';
import { ArrowRight, Copy, Trash2, X } from 'lucide-react';
import { useSelectionStore } from '../../stores/selection.store';
import { useBoardStore } from '../../stores/board.store';
import { Button } from '../ui/Button';
import { TaskTargetPickerDialog } from './TaskTargetPickerDialog';
import styles from './bulk-selection-bar.module.css';

export function BulkSelectionBar() {
  const activeColumnId = useSelectionStore((state) => state.activeColumnId);
  const selectedTaskIds = useSelectionStore((state) => state.selectedTaskIds);
  const exitMode = useSelectionStore((state) => state.exitMode);

  const { bulkMoveTasks, bulkDuplicateTasks, bulkDeleteTasks } = useBoardStore();

  const [pickerMode, setPickerMode] = useState<'move' | 'duplicate' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!activeColumnId) return null;

  const taskIds = Array.from(selectedTaskIds);
  const count = taskIds.length;
  const hasSelection = count > 0;

  const handleDelete = async (): Promise<void> => {
    if (!hasSelection) return;
    if (!window.confirm(`Delete ${count} selected task${count === 1 ? '' : 's'}?`)) return;
    setIsDeleting(true);
    try {
      await bulkDeleteTasks(taskIds);
      exitMode();
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePickerConfirm = async (targetColumnId: string): Promise<void> => {
    if (!pickerMode || !hasSelection) return;
    if (pickerMode === 'move') {
      await bulkMoveTasks(taskIds, targetColumnId);
    } else {
      await bulkDuplicateTasks(taskIds, targetColumnId);
    }
    exitMode();
  };

  return (
    <>
      <div className={styles.bar} role="toolbar" aria-label="Bulk task actions">
        <div className={styles.count}>
          <span className={styles.countNumber}>{count}</span>
          <span className={styles.countLabel}>selected</span>
        </div>
        <div className={styles.divider} />
        <Button
          size="sm"
          variant="secondary"
          disabled={!hasSelection}
          onClick={() => setPickerMode('move')}
        >
          <ArrowRight size={14} /> Move to…
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!hasSelection}
          onClick={() => setPickerMode('duplicate')}
        >
          <Copy size={14} /> Duplicate to…
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={!hasSelection}
          loading={isDeleting}
          onClick={handleDelete}
        >
          <Trash2 size={14} /> Delete
        </Button>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={exitMode}
          aria-label="Exit selection mode"
        >
          <X size={16} />
        </button>
      </div>

      <TaskTargetPickerDialog
        open={pickerMode !== null}
        onClose={() => setPickerMode(null)}
        mode={pickerMode ?? 'move'}
        taskCount={count}
        onConfirm={handlePickerConfirm}
      />
    </>
  );
}
