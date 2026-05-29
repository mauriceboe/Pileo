import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as tasksApi from '../api/tasks.api';

/**
 * Navigates to the board containing a task with `?task=<id>` in the URL.
 * BoardView picks up the query param and opens the detail view as soon as the
 * board has loaded — no timing race between navigation and the openTaskDetail
 * call landing.
 *
 * Used from places where only a task ID is known (notifications, dashboard tiles).
 */
export function useOpenTaskInContext(): (taskId: string, knownBoard?: { projectId: string; boardId: string }) => Promise<void> {
  const navigate = useNavigate();

  return useCallback(async (taskId, knownBoard) => {
    let projectId = knownBoard?.projectId;
    let boardId = knownBoard?.boardId;

    if (!projectId || !boardId) {
      try {
        const ctx = await tasksApi.getTaskContext(taskId);
        projectId = ctx.projectId;
        boardId = ctx.boardId;
      } catch {
        navigate('/');
        return;
      }
    }

    navigate(`/projects/${projectId}/boards/${boardId}?task=${encodeURIComponent(taskId)}`);
  }, [navigate]);
}
