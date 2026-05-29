import { useParams } from 'react-router-dom';
import { useProjectBoardsLoader } from '../hooks/useProjectBoardsLoader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import styles from './project-boards-page.module.css';

export function ProjectBoardsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { isLoading } = useProjectBoardsLoader(projectId);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner />
      </div>
    );
  }

  return null;
}
