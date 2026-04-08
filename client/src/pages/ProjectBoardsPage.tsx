import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as boardsApi from '../api/boards.api';
import * as projectsApi from '../api/projects.api';
import { useProjectStore } from '../stores/project.store';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import styles from './project-boards-page.module.css';

export function ProjectBoardsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const selectProject = useProjectStore((state) => state.selectProject);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const loadBoards = async () => {
      setIsLoading(true);
      try {
        const project = await projectsApi.getProject(projectId);
        selectProject(project);

        const boards = await boardsApi.listBoards(projectId);
        const firstBoard = boards[0];
        if (firstBoard) {
          navigate(`/projects/${projectId}/boards/${firstBoard.id}`, { replace: true });
          return;
        }
      } catch {
        // Error handled by API layer
      } finally {
        setIsLoading(false);
      }
    };

    loadBoards();
  }, [projectId, navigate, selectProject]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner />
      </div>
    );
  }

  return null;
}
