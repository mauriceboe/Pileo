import { useEffect, useState } from 'react';
import { FolderKanban } from 'lucide-react';
import { useProjectStore } from '../../stores/project.store';
import { ProjectCard } from './ProjectCard';
import { CreateProjectDialog } from './CreateProjectDialog';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import styles from './project-list.module.css';

export function ProjectList() {
  const { projects, isLoading, fetchProjects } = useProjectStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Projects</h1>
        <Button onClick={() => setShowCreateDialog(true)}>New Project</Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={48} />}
          title="No projects yet"
          description="Create your first project to start organizing your work with Kanban boards."
          action={
            <Button onClick={() => setShowCreateDialog(true)}>
              Create Project
            </Button>
          }
        />
      ) : (
        <div className={styles.grid}>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  );
}
