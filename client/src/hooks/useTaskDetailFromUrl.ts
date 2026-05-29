import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBoardStore } from '../stores/board.store';

/**
 * Consumes `?task=<id>` from the URL once the board + its tasks are loaded
 * and opens the task detail view. Strips the param afterwards so a refresh
 * doesn't reopen the dialog and the back button works as expected.
 *
 * Replaces the previous `setTimeout(300)` race in useOpenTaskInContext — by
 * waiting on tasksByColumn having the task, we no longer guess how long the
 * board takes to load.
 */
export function useTaskDetailFromUrl(): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const taskParam = searchParams.get('task');
  const board = useBoardStore((s) => s.board);
  const tasksByColumn = useBoardStore((s) => s.tasksByColumn);
  const openTaskDetail = useBoardStore((s) => s.openTaskDetail);
  const consumedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!taskParam || !board) return;
    if (consumedFor.current === taskParam) return;

    const taskExists = Object.values(tasksByColumn).some((tasks) =>
      tasks.some((task) => task.id === taskParam),
    );
    if (!taskExists) return;

    consumedFor.current = taskParam;
    openTaskDetail(taskParam);

    const next = new URLSearchParams(searchParams);
    next.delete('task');
    setSearchParams(next, { replace: true });
  }, [taskParam, board, tasksByColumn, openTaskDetail, searchParams, setSearchParams]);
}
