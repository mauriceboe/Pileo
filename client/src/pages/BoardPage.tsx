import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBoardStore } from '../stores/board.store';
import { useProjectStore } from '../stores/project.store';
import { useWebSocket } from '../hooks/useWebSocket';
import * as projectsApi from '../api/projects.api';
import { BoardView } from '../components/board/BoardView';

export function BoardPage() {
  const { projectId, boardId } = useParams<{
    projectId: string;
    boardId: string;
  }>();
  const fetchBoard = useBoardStore((state) => state.fetchBoard);
  const fetchProjectLabels = useBoardStore((state) => state.fetchProjectLabels);
  const selectProject = useProjectStore((state) => state.selectProject);
  const fetchMembers = useProjectStore((state) => state.fetchMembers);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // Connect/disconnect WebSocket when board is active
  useWebSocket(boardId);

  useEffect(() => {
    if (!boardId) return;
    fetchBoard(boardId);
  }, [boardId, fetchBoard]);

  useEffect(() => {
    if (!projectId) return;

    const loadProject = async () => {
      try {
        const project = await projectsApi.getProject(projectId);
        selectProject(project);
        setBackgroundImage(project.backgroundImage);
      } catch {
        // Project fetch failure is non-critical for board rendering
      }
    };

    loadProject();
    fetchMembers(projectId);
    fetchProjectLabels(projectId);
  }, [projectId, selectProject, fetchMembers, fetchProjectLabels]);

  return <BoardView backgroundImage={backgroundImage} />;
}
