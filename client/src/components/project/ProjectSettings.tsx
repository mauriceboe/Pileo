import { useState, useRef, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProjectSchema } from '@pileo/shared';
import type { Project, UpdateProjectInput } from '@pileo/shared';
import { Upload, X } from 'lucide-react';
import { useProjectStore } from '../../stores/project.store';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import styles from './project-settings.module.css';

interface ProjectSettingsProps {
  project: Project;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  const { updateProject, deleteProject, uploadBackground } = useProjectStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(
    project.backgroundImage ?? null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: project.name,
      description: project.description,
    },
  });

  const onSubmit = async (data: UpdateProjectInput): Promise<void> => {
    await updateProject(project.id, data);
  };

  const handleBackgroundChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const updated = await uploadBackground(project.id, file);
      setBackgroundPreview(updated.backgroundImage ?? null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveBackground = async (): Promise<void> => {
    await updateProject(project.id, { backgroundImage: null });
    setBackgroundPreview(null);
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

          <div className={styles.textareaWrapper}>
            <label className={styles.textareaLabel} htmlFor="settings-description">
              Description
            </label>
            <textarea
              id="settings-description"
              className={styles.textarea}
              {...register('description')}
            />
          </div>

          <div className={styles.actions}>
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Background Image</h3>
        <p className={styles.backgroundDescription}>
          Set a custom background image for the board view of this project.
        </p>

        {backgroundPreview && (
          <div className={styles.backgroundPreview}>
            <img
              src={backgroundPreview}
              alt="Project background"
              className={styles.backgroundImage}
            />
            <button
              type="button"
              className={styles.removeBackground}
              onClick={handleRemoveBackground}
              aria-label="Remove background"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className={styles.backgroundUpload}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className={styles.fileInput}
            onChange={handleBackgroundChange}
            id="background-upload"
          />
          <label htmlFor="background-upload" className={styles.uploadLabel}>
            <Upload size={16} />
            {isUploading ? 'Uploading...' : 'Choose Image'}
          </label>
        </div>
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
