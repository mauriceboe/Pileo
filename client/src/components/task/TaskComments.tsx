import { useState, useEffect, useCallback, useRef } from 'react';
// lucide-react icons removed — using text-only buttons
import { useAuthStore } from '../../stores/auth.store';
import { useProjectStore } from '../../stores/project.store';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import * as commentsApi from '../../api/comments.api';
import type { CommentWithAuthor } from '../../api/comments.api';
import styles from './task-comments.module.css';

function renderMentions(text: string): React.ReactNode {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className={styles.mention}>{part}</span>
    ) : (
      part
    ),
  );
}

interface TaskCommentsProps {
  taskId: string;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [commentsList, setCommentsList] = useState<CommentWithAuthor[]>([]);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentUser = useAuthStore((state) => state.user);
  const members = useProjectStore((state) => state.members);

  const fetchComments = useCallback(async () => {
    try {
      const data = await commentsApi.listComments(taskId);
      setCommentsList(data);
    } catch {
      // Silently fail — comments are non-critical
    }
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = newContent.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const comment = await commentsApi.createComment(taskId, { content: trimmed });
      setCommentsList((prev) => [comment, ...prev]);
      setNewContent('');
      setShowMentions(false);
    } catch {
      // Error handled by API client
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    const trimmed = editContent.trim();
    if (!trimmed) return;

    try {
      const updated = await commentsApi.updateComment(commentId, { content: trimmed });
      setCommentsList((prev) =>
        prev.map((c) => (c.id === commentId ? updated : c)),
      );
      setEditingId(null);
      setEditContent('');
    } catch {
      // Error handled by API client
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      await commentsApi.deleteComment(commentId);
      setCommentsList((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      // Error handled by API client
    }
  };

  const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setNewContent(value);

    // Detect @ mention
    const cursorPos = event.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionFilter(mentionMatch[1]?.toLowerCase() ?? '');
    } else {
      setShowMentions(false);
      setMentionFilter('');
    }
  };

  const handleSelectMention = (username: string) => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = newContent.substring(0, cursorPos);
    const textAfterCursor = newContent.substring(cursorPos);

    // Replace the @partial with @username
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
      const newValue = `${beforeMention}@${username} ${textAfterCursor}`;
      setNewContent(newValue);
    }

    setShowMentions(false);
    setMentionFilter('');
    textareaRef.current.focus();
  };

  const filteredMembers = members.filter((member) => {
    if (!mentionFilter) return true;
    const username = member.user?.username?.toLowerCase() ?? '';
    const displayName = member.user?.displayName?.toLowerCase() ?? '';
    return username.includes(mentionFilter) || displayName.includes(mentionFilter);
  });

  return (
    <div className={styles.container}>
      <form className={styles.newCommentForm} onSubmit={handleSubmit}>
        <div className={styles.textareaWrapper}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={newContent}
            onChange={handleTextareaChange}
            placeholder="Write a comment... Use @ to mention"
            rows={2}
          />
          {showMentions && filteredMembers.length > 0 && (
            <div className={styles.mentionDropdown}>
              {filteredMembers.map((member) => (
                <button
                  key={member.userId}
                  type="button"
                  className={styles.mentionOption}
                  onClick={() => handleSelectMention(member.user?.username ?? '')}
                >
                  <Avatar
                    name={member.user?.displayName ?? 'User'}
                    src={member.user?.avatarPath}
                    size="sm"
                  />
                  <span className={styles.mentionName}>
                    {member.user?.displayName ?? 'User'}
                  </span>
                  <span className={styles.mentionUsername}>
                    @{member.user?.username ?? ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={styles.formActions}>
          <Button
            type="submit"
            size="sm"
            loading={isSubmitting}
            disabled={!newContent.trim()}
          >
            Send
          </Button>
        </div>
      </form>

      <div className={styles.commentList}>
        {commentsList.length === 0 && (
          <p className={styles.emptyMessage}>No comments yet</p>
        )}

        {commentsList.map((comment) => {
          const isOwn = comment.authorId === currentUser?.id;
          const isEditing = editingId === comment.id;
          const wasEdited = comment.updatedAt !== comment.createdAt;

          return (
            <div key={comment.id} className={styles.comment}>
              <Avatar
                name={comment.author.displayName}
                src={comment.author.avatarPath}
                size="sm"
              />
              <div className={styles.commentBody}>
                <div className={styles.commentHeader}>
                  <span className={styles.authorName}>
                    {comment.author.displayName}
                  </span>
                  <span className={styles.timestamp}>
                    {formatTimestamp(comment.createdAt)}
                  </span>
                  {wasEdited && (
                    <span className={styles.edited}>(edited)</span>
                  )}
                </div>

                {isEditing ? (
                  <div className={styles.newCommentForm}>
                    <textarea
                      className={styles.textarea}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                    />
                    <div className={styles.formActions}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditContent('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleEdit(comment.id)}
                        disabled={!editContent.trim()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className={styles.commentContent}>{renderMentions(comment.content)}</p>
                )}

                {isOwn && !isEditing && (
                  <div className={styles.commentActions}>
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditContent(comment.content);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                      onClick={() => handleDelete(comment.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
