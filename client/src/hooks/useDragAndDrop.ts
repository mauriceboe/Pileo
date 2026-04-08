import { useState, useCallback, useRef } from 'react';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import type { TaskWithRelations } from '../api/tasks.api';
import { useBoardStore } from '../stores/board.store';

interface DragState {
  activeTask: TaskWithRelations | null;
  activeColumnId: string | null;
}

export function useDragAndDrop() {
  const [dragState, setDragState] = useState<DragState>({
    activeTask: null,
    activeColumnId: null,
  });
  const movingRef = useRef(false);
  const lastTargetRef = useRef('');

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task as TaskWithRelations | undefined;
    if (!task) return;

    movingRef.current = false;
    lastTargetRef.current = '';
    setDragState({
      activeTask: task,
      activeColumnId: task.columnId,
    });
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || movingRef.current) return;

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
      targetColumnId = over.id as string;
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

    // Deduplicate: skip if same target as last move
    const targetKey = `${targetColumnId}:${targetIndex}`;
    if (lastTargetRef.current === targetKey) return;
    lastTargetRef.current = targetKey;

    // Lock to prevent re-entrant calls during React batched updates
    movingRef.current = true;
    moveTaskOptimistic(activeTask.id, currentColumnId, targetColumnId, targetIndex);
    // Release lock after React has processed the update
    requestAnimationFrame(() => { movingRef.current = false; });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    const activeTask = active.data.current?.task as TaskWithRelations | undefined;

    movingRef.current = false;
    lastTargetRef.current = '';

    if (!activeTask || !over) {
      setDragState({ activeTask: null, activeColumnId: null });
      return;
    }

    const { tasksByColumn, moveTask } = useBoardStore.getState();

    // Find the current position after optimistic move
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

    setDragState({ activeTask: null, activeColumnId: null });
  }, []);

  const handleDragCancel = useCallback(() => {
    movingRef.current = false;
    lastTargetRef.current = '';
    setDragState({ activeTask: null, activeColumnId: null });
  }, []);

  return {
    activeTask: dragState.activeTask,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
