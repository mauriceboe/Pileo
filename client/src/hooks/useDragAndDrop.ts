import { useState, useCallback, useRef } from 'react';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import type { TaskWithRelations } from '../api/tasks.api';
import { useBoardStore } from '../stores/board.store';

interface DragState {
  activeTask: TaskWithRelations | null;
  activeColumnDragId: string | null;
}

function stripColumnPrefix(id: string | null | undefined): string | null {
  if (!id) return null;
  return id.startsWith('col:') ? id.slice(4) : null;
}

export function useDragAndDrop() {
  const [dragState, setDragState] = useState<DragState>({
    activeTask: null,
    activeColumnDragId: null,
  });
  const movingRef = useRef(false);
  const lastTargetRef = useRef('');
  const columnOrderDirtyRef = useRef(false);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeType = active.data.current?.type as string | undefined;

    if (activeType === 'column') {
      const columnId = active.data.current?.columnId as string | undefined;
      if (!columnId) return;
      movingRef.current = false;
      lastTargetRef.current = '';
      columnOrderDirtyRef.current = false;
      setDragState({ activeTask: null, activeColumnDragId: columnId });
      return;
    }

    const task = active.data.current?.task as TaskWithRelations | undefined;
    if (!task) return;

    movingRef.current = false;
    lastTargetRef.current = '';
    setDragState({
      activeTask: task,
      activeColumnDragId: null,
    });
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || movingRef.current) return;

    const activeType = active.data.current?.type as string | undefined;

    // Column reorder (live preview)
    if (activeType === 'column') {
      const activeColumnId = active.data.current?.columnId as string | undefined;
      const overColumnId = stripColumnPrefix(over.id as string);
      if (!activeColumnId || !overColumnId || activeColumnId === overColumnId) return;

      const { board } = useBoardStore.getState();
      if (!board) return;

      const orderedIds = [...board.columns]
        .sort((a, b) => a.position - b.position)
        .map((c) => c.id);

      const fromIndex = orderedIds.indexOf(activeColumnId);
      const toIndex = orderedIds.indexOf(overColumnId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      const next = [...orderedIds];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, activeColumnId);

      const targetKey = `col-order:${next.join(',')}`;
      if (lastTargetRef.current === targetKey) return;
      lastTargetRef.current = targetKey;

      columnOrderDirtyRef.current = true;
      movingRef.current = true;

      const columnMap = new Map(board.columns.map((c) => [c.id, c]));
      const reordered = next
        .map((id, index) => {
          const col = columnMap.get(id);
          return col ? { ...col, position: index } : null;
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      useBoardStore.setState({
        board: { ...board, columns: reordered },
      });

      requestAnimationFrame(() => { movingRef.current = false; });
      return;
    }

    const activeTask = active.data.current?.task as TaskWithRelations | undefined;
    if (!activeTask) return;

    const overType = over.data.current?.type as string | undefined;
    const overTask = over.data.current?.task as TaskWithRelations | undefined;

    let targetColumnId: string;
    let targetIndex: number;

    const { tasksByColumn, moveTaskOptimistic } = useBoardStore.getState();

    if (overType === 'task' && overTask) {
      targetColumnId = overTask.columnId;
      const columnTasks = tasksByColumn[targetColumnId] ?? [];
      targetIndex = columnTasks.findIndex((t) => t.id === overTask.id);
    } else if (overType === 'column') {
      targetColumnId = (over.data.current?.columnId as string) ?? (over.id as string);
      const columnTasks = tasksByColumn[targetColumnId] ?? [];
      targetIndex = columnTasks.length;
    } else {
      return;
    }

    // Find which column the active task is currently in
    let currentColumnId: string | null = null;
    for (const columnId of Object.keys(tasksByColumn)) {
      const tasks = tasksByColumn[columnId];
      if (tasks?.some((t) => t.id === activeTask.id)) {
        currentColumnId = columnId;
        break;
      }
    }

    if (!currentColumnId) return;

    const currentTasks = tasksByColumn[currentColumnId] ?? [];
    const currentIndex = currentTasks.findIndex((t) => t.id === activeTask.id);

    if (currentColumnId === targetColumnId && currentIndex === targetIndex) return;

    const targetKey = `${targetColumnId}:${targetIndex}`;
    if (lastTargetRef.current === targetKey) return;
    lastTargetRef.current = targetKey;

    movingRef.current = true;
    moveTaskOptimistic(activeTask.id, currentColumnId, targetColumnId, targetIndex);
    requestAnimationFrame(() => { movingRef.current = false; });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active } = event;
    const activeType = active.data.current?.type as string | undefined;

    // Column reorder — persist if order changed
    if (activeType === 'column') {
      const { board, reorderColumns } = useBoardStore.getState();
      if (board && columnOrderDirtyRef.current) {
        const orderedIds = [...board.columns]
          .sort((a, b) => a.position - b.position)
          .map((c) => c.id);
        reorderColumns(board.id, orderedIds);
      }
      columnOrderDirtyRef.current = false;
      movingRef.current = false;
      lastTargetRef.current = '';
      setDragState({ activeTask: null, activeColumnDragId: null });
      return;
    }

    const activeTask = active.data.current?.task as TaskWithRelations | undefined;

    movingRef.current = false;
    lastTargetRef.current = '';

    if (!activeTask) {
      setDragState({ activeTask: null, activeColumnDragId: null });
      return;
    }

    const { tasksByColumn, moveTask } = useBoardStore.getState();

    let finalColumnId: string | null = null;
    let finalPosition = 0;

    for (const columnId of Object.keys(tasksByColumn)) {
      const tasks = tasksByColumn[columnId];
      if (!tasks) continue;
      const index = tasks.findIndex((t) => t.id === activeTask.id);
      if (index !== -1) {
        finalColumnId = columnId;
        finalPosition = index;
        break;
      }
    }

    if (finalColumnId) {
      moveTask(activeTask.id, finalColumnId, finalPosition);
    }

    setDragState({ activeTask: null, activeColumnDragId: null });
  }, []);

  const handleDragCancel = useCallback(() => {
    movingRef.current = false;
    lastTargetRef.current = '';
    columnOrderDirtyRef.current = false;
    setDragState({ activeTask: null, activeColumnDragId: null });
  }, []);

  return {
    activeTask: dragState.activeTask,
    activeColumnDragId: dragState.activeColumnDragId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
