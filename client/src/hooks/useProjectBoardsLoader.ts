import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as boardsApi from '../api/boards.api';
import * as projectsApi from '../api/projects.api';
import { useProjectStore } from '../stores/project.store';

export function useProjectBoardsLoader(projectId: string | undefined): { isLoading: boolean } {
  const navigate = useNavigate();
  const selectProject = useProjectStore((state) => state.selectProject);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const project = await projectsApi.getProject(projectId);
        if (cancelled) return;
        selectProject(project);

        const boards = await boardsApi.listBoards(projectId);
        if (cancelled) return;
        const firstBoard = boards[0];
        if (firstBoard) {
          navigate(`/projects/${projectId}/boards/${firstBoard.id}`, { replace: true });
        }
      } catch {
        // Errors surfaced by API layer
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [projectId, navigate, selectProject]);

  return { isLoading };
}
