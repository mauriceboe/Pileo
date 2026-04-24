import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import * as boardsApi from '../../api/boards.api';
import type { Board, Column } from '@pileo/shared';
import type { BoardWithColumns } from '../../api/boards.api';
import { useProjectStore } from '../../stores/project.store';
import { useBoardStore } from '../../stores/board.store';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import styles from './task-target-picker.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'move' | 'duplicate';
  taskCount: number;
  onConfirm: (targetColumnId: string) => Promise<void>;
}

interface BoardColumnsEntry {
  board: Board;
  columns: Column[];
  loading: boolean;
}

export function TaskTargetPickerDialog({ open, onClose, mode, taskCount, onConfirm }: Props) {
  const selectedProject = useProjectStore((state) => state.selectedProject);
  const currentBoard = useBoardStore((state) => state.board);

  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [columnsCache, setColumnsCache] = useState<Record<string, BoardColumnsEntry>>({});
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !selectedProject) return;
    setBoardsLoading(true);
    boardsApi
      .listBoards(selectedProject.id)
      .then((loaded) => {
        setBoards(loaded);
        const initialBoardId = currentBoard?.id ?? loaded[0]?.id ?? null;
        setSelectedBoardId(initialBoardId);
      })
      .finally(() => setBoardsLoading(false));
  }, [open, selectedProject, currentBoard?.id]);

  useEffect(() => {
    if (!open) {
      setSelectedColumnId(null);
      setColumnsCache({});
    }
  }, [open]);

  useEffect(() => {
    if (!selectedBoardId) return;
    if (columnsCache[selectedBoardId]) return;

    // Current board columns are already in memory
    if (currentBoard && currentBoard.id === selectedBoardId) {
      setColumnsCache((prev) => ({
        ...prev,
        [selectedBoardId]: { board: currentBoard, columns: currentBoard.columns, loading: false },
      }));
      return;
    }

    setColumnsCache((prev) => ({
      ...prev,
      [selectedBoardId]: {
        board: boards.find((b) => b.id === selectedBoardId) as Board,
        columns: [],
        loading: true,
      },
    }));

    boardsApi.getBoard(selectedBoardId).then((boardData: BoardWithColumns) => {
      setColumnsCache((prev) => ({
        ...prev,
        [selectedBoardId]: {
          board: boardData,
          columns: boardData.columns,
          loading: false,
        },
      }));
    });
  }, [selectedBoardId, boards, currentBoard, columnsCache]);

  const activeEntry = selectedBoardId ? columnsCache[selectedBoardId] : undefined;
  const sortedColumns = useMemo(() => {
    if (!activeEntry) return [];
    return [...activeEntry.columns].sort((a, b) => a.position - b.position);
  }, [activeEntry]);

  const canConfirm = !!selectedColumnId && !submitting;

  const handleConfirm = async (): Promise<void> => {
    if (!selectedColumnId) return;
    setSubmitting(true);
    try {
      await onConfirm(selectedColumnId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'move'
    ? `Move ${taskCount} task${taskCount === 1 ? '' : 's'} to…`
    : `Duplicate ${taskCount} task${taskCount === 1 ? '' : 's'} to…`;

  return (
    <Dialog open={open} onClose={onClose} title={title} size="lg">
      <div className={styles.pickerGrid}>
        <div className={styles.boardsPane}>
          <div className={styles.paneLabel}>Board</div>
          {boardsLoading ? (
            <div className={styles.loading}><Loader2 size={16} className={styles.spinner} /> Loading…</div>
          ) : (
            <ul className={styles.list}>
              {boards.map((board) => (
                <li key={board.id}>
                  <button
                    type="button"
                    className={`${styles.listItem} ${selectedBoardId === board.id ? styles.listItemActive : ''}`}
                    onClick={() => {
                      setSelectedBoardId(board.id);
                      setSelectedColumnId(null);
                    }}
                  >
                    <span className={styles.boardName}>{board.name}</span>
                    {currentBoard?.id === board.id && (
                      <span className={styles.currentTag}>current</span>
                    )}
                    <ArrowRight size={14} className={styles.listChevron} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.columnsPane}>
          <div className={styles.paneLabel}>Column</div>
          {!selectedBoardId ? (
            <div className={styles.empty}>Pick a board first</div>
          ) : activeEntry?.loading ? (
            <div className={styles.loading}><Loader2 size={16} className={styles.spinner} /> Loading columns…</div>
          ) : sortedColumns.length === 0 ? (
            <div className={styles.empty}>No columns in this board</div>
          ) : (
            <ul className={styles.list}>
              {sortedColumns.map((column) => (
                <li key={column.id}>
                  <button
                    type="button"
                    className={`${styles.columnItem} ${selectedColumnId === column.id ? styles.columnItemActive : ''}`}
                    onClick={() => setSelectedColumnId(column.id)}
                  >
                    <span className={styles.columnSwatch} style={{ backgroundColor: column.color }} />
                    <span className={styles.columnName}>{column.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} disabled={!canConfirm} loading={submitting}>
          {mode === 'move' ? 'Move tasks' : 'Duplicate tasks'}
        </Button>
      </div>
    </Dialog>
  );
}
