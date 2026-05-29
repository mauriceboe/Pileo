import { useState } from 'react';
import type { CommentWithAuthor } from '@pileo/shared';
import { useAuthStore } from '../../stores/auth.store';
import { Avatar } from '../ui/Avatar';
import { timeAgo } from '../../utils/time-format';
import { renderMentions } from '../../utils/render-mentions';
import { CommentForm } from './CommentForm';
import styles from './task-comments.module.css';

interface CommentItemProps {
  comment: CommentWithAuthor;
  onEdit: (commentId: string, content: string) => Promise<void> | void;
  onDelete: (commentId: string) => Promise<void> | void;
}

export function CommentItem({ comment, onEdit, onDelete }: CommentItemProps) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isOwn = comment.authorId === currentUserId;
  const wasEdited = comment.updatedAt !== comment.createdAt;
  const [isEditing, setIsEditing] = useState(false);

  const handleDelete = () => {
    if (!window.confirm('Delete this comment?')) return;
    onDelete(comment.id);
  };

  return (
    <div className={styles.comment}>
      <Avatar name={comment.author.displayName} src={comment.author.avatarPath} size="sm" />
      <div className={styles.commentBody}>
        <div className={styles.commentHeader}>
          <span className={styles.authorName}>{comment.author.displayName}</span>
          <span className={styles.timestamp}>{timeAgo(comment.createdAt)}</span>
          {wasEdited && <span className={styles.edited}>(edited)</span>}
        </div>

        {isEditing ? (
          <CommentForm
            initialContent={comment.content}
            submitLabel="Save"
            onSubmit={async (content) => {
              await onEdit(comment.id, content);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
            autoFocus
          />
        ) : (
          <p className={styles.commentContent}>{renderMentions(comment.content, styles.mention!)}</p>
        )}

        {isOwn && !isEditing && (
          <div className={styles.commentActions}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.actionButtonDanger}`}
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
