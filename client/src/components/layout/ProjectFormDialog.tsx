import { useEffect, useState } from 'react';
import type { Project } from '@pileo/shared';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PROJECT_ICONS } from '../../constants/project-icons';
import styles from './sidebar.module.css';

const DEFAULT_ICON = 'layers';

interface ProjectFormDialogProps {
  open: boolean;
  /**
   * When provided, the dialog opens in "edit" mode with the project's existing
   * values pre-filled. When undefined, opens in "create" mode.
   */
  project?: Project | null;
  onClose: () => void;
  onSubmit: (input: { name: string; icon: string | null }) => Promise<void> | void;
}

export function ProjectFormDialog({ open, project, onClose, onSubmit }: ProjectFormDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? '');
    setIcon(project?.icon ?? DEFAULT_ICON);
  }, [open, project]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      await onSubmit({ name: trimmed, icon: icon || null });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={project ? 'Edit Project' : 'New Project'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Input
          label="Project Name"
          placeholder="My Project"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
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
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} loading={isSaving} disabled={!name.trim()}>
            {project ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
