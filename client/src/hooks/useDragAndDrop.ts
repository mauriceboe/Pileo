import { useState, useCallback, useRef } from 'react';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import type { TaskWithRelations } from '../api/tasks.api';
import { useBoardStore } from '../stores/board.store';

interface DragState {
  activeTask: TaskWithRelations | null;
  activeColumnId: string | null;
}

export function useDragAndDrop() {
  const { tasksByColumn, moveTaskOptimistic, moveTask } = useBoardStore();
  const [dragState, setDragState] = useState<DragState>({
    activeTask: null,
    activeColumnId: null,
  });
  const lastMoveRef = useRef<string>('');

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task as TaskWithRelations | undefined;
    if (!task) return;

    lastMoveRef.current = '';
    setDragState({
      activeTask: task,
      activeColumnId: task.columnId,
    });
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = active.data.current?.task as TaskWithRelations | undefined;
    if (!activeTask) return;

    const overType = over.data.current?.type as string | undefined;
    const overTask = over.data.current?.task as TaskWithRelations | undefined;

    let targetColumnId: string;
    let targetIndex: number;

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

    // Only move if something changed
    const currentTasks = tasksByColumn[currentColumnId] ?? [];
    const currentIndex = currentTasks.findIndex((t) => t.id === activeTask.id);

    if (currentColumnId === targetColumnId && currentIndex === targetIndex) return;

    // Prevent re-entrant moves that cause infinite loops
    const moveKey = `${activeTask.id}:${currentColumnId}:${targetColumnId}:${targetIndex}`;
    if (lastMoveRef.current === moveKey) return;
    lastMoveRef.current = moveKey;

    moveTaskOptimistic(activeTask.id, currentColumnId, targetColumnId, targetIndex);
  }, [tasksByColumn, moveTaskOptimistic]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    const activeTask = active.data.current?.task as TaskWithRelations | undefined;

    if (!activeTask || !over) {
      setDragState({ activeTask: null, activeColumnId: null });
      return;
    }

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
  }, [tasksByColumn, moveTask]);

  const handleDragCancel = useCallback(() => {
    lastMoveRef.current = '';
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
