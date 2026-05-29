import { useTaskComments } from '../../hooks/useTaskComments';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';
import styles from './task-comments.module.css';

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { comments, create, update, remove } = useTaskComments(taskId);

  return (
    <div className={styles.container}>
      <CommentForm submitLabel="Send" onSubmit={create} />

      <div className={styles.commentList}>
        {comments.length === 0 && (
          <p className={styles.emptyMessage}>No comments yet</p>
        )}
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onEdit={update}
            onDelete={remove}
          />
        ))}
      </div>
    </div>
  );
}
