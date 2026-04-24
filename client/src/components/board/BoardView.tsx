import { useEffect, useMemo, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useBoardStore } from '../../stores/board.store';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { Column } from './Column';
import { AddColumnButton } from './AddColumnButton';
import { TaskCard } from './TaskCard';
import { LiveCursors } from './LiveCursors';
import { TaskDetail } from '../task/TaskDetail';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { BulkSelectionBar } from './BulkSelectionBar';
import styles from './board-view.module.css';
import columnStyles from './column.module.css';

export function BoardView() {
  const { board, isLoading, error, isTaskDetailOpen } = useBoardStore();
  const fetchTasks = useBoardStore((state) => state.fetchTasks);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0 || el.scrollWidth <= el.clientWidth) return;

      const target = e.target as HTMLElement | null;
      const taskArea = target?.closest(`.${columnStyles.taskArea}`) as HTMLElement | null;
      if (taskArea && taskArea.scrollHeight > taskArea.clientHeight) {
        return;
      }

      e.preventDefault();
      el.scrollBy({ left: e.deltaY * 2, behavior: 'auto' });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [board]);

  const {
    activeTask,
    activeColumnDragId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useDragAndDrop();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  };

  useEffect(() => {
    if (board?.id) {
      fetchTasks(board.id);
    }
  }, [board?.id, fetchTasks]);

  const sortedColumns = useMemo(() => {
    if (!board) return [];
    return [...board.columns].sort((a, b) => a.position - b.position);
  }, [board]);

  const columnSortableIds = useMemo(
    () => sortedColumns.map((column) => `col:${column.id}`),
    [sortedColumns],
  );

  const activeColumnForOverlay = activeColumnDragId
    ? sortedColumns.find((col) => col.id === activeColumnDragId)
    : undefined;

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  if (!board) return null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div ref={containerRef} className={styles.container}>
          <SortableContext items={columnSortableIds} strategy={horizontalListSortingStrategy}>
            {sortedColumns.map((column) => (
              <Column key={column.id} column={column} />
            ))}
          </SortableContext>
          <AddColumnButton boardId={board.id} />
          <LiveCursors containerRef={containerRef} />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <TaskCard task={activeTask} isDragOverlay />
          ) : activeColumnForOverlay ? (
            <div className={styles.columnDragPreview}>
              <div
                className={styles.columnDragPreviewHeader}
                style={{ backgroundColor: activeColumnForOverlay.color }}
              >
                {activeColumnForOverlay.name}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {isTaskDetailOpen && <TaskDetail />}
      <BulkSelectionBar />
    </>
  );
}
