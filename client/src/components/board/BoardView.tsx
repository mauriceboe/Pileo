import { useEffect, useRef } from 'react';
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
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useBoardStore } from '../../stores/board.store';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { Column } from './Column';
import { AddColumnButton } from './AddColumnButton';
import { TaskCard } from './TaskCard';
import { LiveCursors } from './LiveCursors';
import { TaskDetail } from '../task/TaskDetail';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import styles from './board-view.module.css';

interface BoardViewProps {
  backgroundImage?: string | null;
}

export function BoardView({ backgroundImage }: BoardViewProps) {
  const { board, isLoading, error, isTaskDetailOpen } = useBoardStore();
  const fetchTasks = useBoardStore((state) => state.fetchTasks);
  const containerRef = useRef<HTMLDivElement>(null);

  // Horizontal scroll with mouse wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      // Only hijack if vertical scroll and container can scroll horizontally
      if (e.deltaY !== 0 && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY * 2, behavior: 'auto' });
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [board]);

  const {
    activeTask,
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

  // Use pointerWithin first (precise), fall back to rectIntersection (for columns)
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

  const containerStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})` }
    : undefined;

  const sortedColumns = [...board.columns].sort(
    (a, b) => a.position - b.position,
  );

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
        <div ref={containerRef} className={styles.container} style={containerStyle}>
          {sortedColumns.map((column) => (
            <Column key={column.id} column={column} />
          ))}
          <AddColumnButton boardId={board.id} />
          <LiveCursors containerRef={containerRef} />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <TaskCard task={activeTask} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {isTaskDetailOpen && <TaskDetail />}
    </>
  );
}
