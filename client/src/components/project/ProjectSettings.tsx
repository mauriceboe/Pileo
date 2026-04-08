import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProjectSchema } from '@pileo/shared';
import type { Project, UpdateProjectInput } from '@pileo/shared';
import { useProjectStore } from '../../stores/project.store';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { CustomFieldsSettings } from './CustomFieldsSettings';
import styles from './project-settings.module.css';

interface ProjectSettingsProps {
  project: Project;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  const { updateProject, deleteProject } = useProjectStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: project.name,
    },
  });

  const onSubmit = async (data: UpdateProjectInput): Promise<void> => {
    await updateProject(project.id, data);
  };

  const handleDelete = async (): Promise<void> => {
    if (!window.confirm(`Delete "${project.name}"? This action cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteProject(project.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>General</h3>
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Project Name"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className={styles.actions}>
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Custom Fields</h3>
        <CustomFieldsSettings projectId={project.id} />
      </div>

      <div className={styles.section}>
        <div className={styles.dangerZone}>
          <h4 className={styles.dangerTitle}>Danger Zone</h4>
          <p className={styles.dangerDescription}>
            Deleting this project will permanently remove all boards, columns, tasks,
            and related data. This cannot be undone.
          </p>
          <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
            Delete Project
          </Button>
        </div>
      </div>
    </div>
  );
}
