import { useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useBoardStore } from '../../stores/board.store';
import styles from './task-description.module.css';

interface TaskDescriptionProps {
  taskId: string;
  description: string | null;
}

export function TaskDescription({ taskId, description }: TaskDescriptionProps) {
  const updateTask = useBoardStore((state) => state.updateTask);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback((content: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      const value = content.trim() || null;
      updateTask(taskId, { description: value });
    }, 500);
  }, [taskId, updateTask]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Add a description...',
      }),
    ],
    content: description ?? '',
    onUpdate: ({ editor: editorInstance }) => {
      handleSave(editorInstance.getText());
    },
    onBlur: ({ editor: editorInstance }) => {
      // Ensure immediate save on blur
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      const value = editorInstance.getText().trim() || null;
      updateTask(taskId, { description: value });
    },
  });

  return (
    <div className={styles.container}>
      <div className={styles.editor}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
