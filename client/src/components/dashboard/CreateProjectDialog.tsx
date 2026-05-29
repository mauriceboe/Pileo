import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as projectsApi from '../../api/projects.api';
import * as boardsApi from '../../api/boards.api';
import { useProjectStore } from '../../stores/project.store';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PROJECT_ICONS } from '../../constants/project-icons';
import styles from '../../pages/dashboard-page.module.css';

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_ICON = 'layers';

export function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const navigate = useNavigate();
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const fetchAllBoards = useProjectStore((s) => s.fetchAllBoards);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [isCreating, setIsCreating] = useState(false);

  const reset = () => {
    setName('');
    setIcon(DEFAULT_ICON);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsCreating(true);
    try {
      const project = await projectsApi.createProject({ name: trimmed, icon: icon || null });
      await fetchProjects();
      await fetchAllBoards();
      reset();
      onClose();
      const boards = await boardsApi.listBoards(project.id);
      const firstBoard = boards[0];
      if (firstBoard) {
        navigate(`/projects/${project.id}/boards/${firstBoard.id}`);
      }
    } catch {
      // Error surfaced by API layer
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} title="New Project">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Input
          label="Project Name"
          placeholder="My Project"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreate();
            }
          }}
          autoFocus
        />
        <div>
          <span className={styles.iconPickerLabel}>Icon</span>
          <div className={styles.iconGrid}>
            {PROJECT_ICONS.map(({ name: iconName, icon: Icon }) => (
              <button
                key={iconName}
                type="button"
                className={`${styles.iconOption} ${icon === iconName ? styles.iconSelected : ''}`}
                onClick={() => setIcon(iconName)}
                title={iconName}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} loading={isCreating} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
