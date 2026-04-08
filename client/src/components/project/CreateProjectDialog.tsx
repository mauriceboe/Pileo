import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema } from '@pileo/shared';
import type { CreateProjectInput } from '@pileo/shared';
import { useProjectStore } from '../../stores/project.store';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import styles from './create-project-dialog.module.css';

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const createProject = useProjectStore((state) => state.createProject);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      description: null,
    },
  });

  const onSubmit = async (data: CreateProjectInput): Promise<void> => {
    try {
      await createProject(data);
      reset();
      onClose();
    } catch {
      // Error is handled by the store/API layer
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Create Project">
      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Project Name"
          placeholder="e.g. Marketing Campaign"
          error={errors.name?.message}
          autoFocus
          {...register('name')}
        />

        <div className={styles.textareaWrapper}>
          <label className={styles.textareaLabel} htmlFor="project-description">
            Description
          </label>
          <textarea
            id="project-description"
            className={`${styles.textarea} ${errors.description ? styles.textareaError : ''}`}
            placeholder="What is this project about?"
            {...register('description')}
          />
          {errors.description && (
            <p className={styles.error} role="alert">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Create
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
