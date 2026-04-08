import { useNavigate } from 'react-router-dom';
import type { Project } from '@pileo/shared';
import styles from './project-card.module.css';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    // Navigate to projects page with project context; board routing happens once boards load
    navigate(`/projects/${project.id}/boards`);
  };

  const backgroundStyle = project.backgroundImage
    ? { backgroundImage: `url(${project.backgroundImage})` }
    : undefined;

  return (
    <div className={styles.card} onClick={handleClick} role="button" tabIndex={0}>
      <div className={styles.background} style={backgroundStyle} />
      <div className={styles.body}>
        <h3 className={styles.name}>{project.name}</h3>
        {project.description && (
          <p className={styles.description}>{project.description}</p>
        )}
      </div>
    </div>
  );
}
