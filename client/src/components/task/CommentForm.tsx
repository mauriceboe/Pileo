import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useProjectStore } from '../../stores/project.store';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import styles from './task-comments.module.css';

interface CommentFormProps {
  initialContent?: string;
  submitLabel: string;
  onSubmit: (content: string) => Promise<void> | void;
  onCancel?: () => void;
  autoFocus?: boolean;
  rows?: number;
}

export function CommentForm({
  initialContent = '',
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus,
  rows = 2,
}: CommentFormProps) {
  const members = useProjectStore((s) => s.members);
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mentionFilter, setMentionFilter] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setContent(value);

    const cursorPos = event.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const match = textBeforeCursor.match(/@(\w*)$/);
    setMentionFilter(match ? (match[1]?.toLowerCase() ?? '') : null);
  };

  const handleSelectMention = (username: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const before = content.substring(0, cursorPos);
    const after = content.substring(cursorPos);
    const match = before.match(/@(\w*)$/);
    if (!match) return;

    const beforeMention = before.substring(0, match.index);
    setContent(`${beforeMention}@${username} ${after}`);
    setMentionFilter(null);
    textarea.focus();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      if (!onCancel) setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = mentionFilter === null
    ? []
    : members.filter((member) => {
      if (!mentionFilter) return true;
      const username = member.user?.username?.toLowerCase() ?? '';
      const displayName = member.user?.displayName?.toLowerCase() ?? '';
      return username.includes(mentionFilter) || displayName.includes(mentionFilter);
    });

  return (
    <form className={styles.newCommentForm} onSubmit={handleSubmit}>
      <div className={styles.textareaWrapper}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={content}
          onChange={handleChange}
          placeholder="Write a comment... Use @ to mention"
          rows={rows}
          autoFocus={autoFocus}
        />
        {filteredMembers.length > 0 && (
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
                  src={member.user?.avatarPath ?? null}
                  size="sm"
                />
                <span className={styles.mentionName}>{member.user?.displayName ?? 'User'}</span>
                <span className={styles.mentionUsername}>@{member.user?.username ?? ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={styles.formActions}>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" loading={isSubmitting} disabled={!content.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
