import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProjectSchema } from '@pileo/shared';
import type { Project, UpdateProjectInput } from '@pileo/shared';
import { useProjectStore } from '../../stores/project.store';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { CustomFieldsSettings } from './CustomFieldsSettings';
import { ProjectMembers } from './ProjectMembers';
import { ApiAccessSettings } from './ApiAccessSettings';
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
    <div className={styles.root}>
      <div className={styles.grid}>
        <div className={styles.column}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>General</h3>
            <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
              <Input
                label="Project Name"
                error={errors.name?.message}
                {...register('name')}
              />

              <div className={styles.actions}>
                <Button type="submit" size="sm" loading={isSubmitting} disabled={!isDirty}>
                  Save Changes
                </Button>
              </div>
            </form>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Members & Roles</h3>
            <p className={styles.sectionHint}>
              Admins can delete boards and columns. Only the owner can delete the project.
            </p>
            <ProjectMembers projectId={project.id} />
          </section>
        </div>

        <div className={styles.column}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Custom Fields</h3>
            <CustomFieldsSettings projectId={project.id} />
          </section>
        </div>

        <div className={styles.column}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>API Access</h3>
            <ApiAccessSettings projectId={project.id} />
          </section>
        </div>
      </div>

      <div className={styles.dangerZone}>
        <div className={styles.dangerText}>
          <h4 className={styles.dangerTitle}>Danger Zone</h4>
          <p className={styles.dangerDescription}>
            Deleting this project will permanently remove all boards, columns, tasks,
            and related data. This cannot be undone.
          </p>
        </div>
        <Button variant="danger" size="sm" onClick={handleDelete} loading={isDeleting}>
          Delete Project
        </Button>
      </div>
    </div>
  );
}
