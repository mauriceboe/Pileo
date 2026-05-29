import { useEffect } from 'react';
import { useBoardStore } from '../stores/board.store';
import { useProjectStore } from '../stores/project.store';
import * as projectsApi from '../api/projects.api';

export function useBoardData(projectId: string | undefined, boardId: string | undefined): void {
  const fetchBoard = useBoardStore((state) => state.fetchBoard);
  const fetchProjectLabels = useBoardStore((state) => state.fetchProjectLabels);
  const selectProject = useProjectStore((state) => state.selectProject);
  const fetchMembers = useProjectStore((state) => state.fetchMembers);

  useEffect(() => {
    if (!boardId) return;
    fetchBoard(boardId);
  }, [boardId, fetchBoard]);

  useEffect(() => {
    if (!projectId) return;
    projectsApi.getProject(projectId).then(selectProject).catch(() => {});
    fetchMembers(projectId);
    fetchProjectLabels(projectId);
  }, [projectId, selectProject, fetchMembers, fetchProjectLabels]);
}
