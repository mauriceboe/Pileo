import { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { useTaskActivity } from '../../hooks/useTaskActivity';
import { timeAgo } from '../../utils/time-format';
import { diffWords } from '../../utils/diff-words';
import { describeActivity } from './describeActivity';
import styles from './task-activity.module.css';

const INITIAL_LIMIT = 15;

interface TaskActivityProps {
  taskId: string;
}

export function TaskActivity({ taskId }: TaskActivityProps) {
  const { entries, isLoading } = useTaskActivity(taskId);
  const [expanded, setExpanded] = useState(false);

  if (isLoading) return null;

  if (entries.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.emptyMessage}>No activity yet</p>
      </div>
    );
  }

  const visibleEntries = expanded ? entries : entries.slice(0, INITIAL_LIMIT);
  const hiddenCount = entries.length - visibleEntries.length;

  return (
    <div className={styles.container}>
      <div className={styles.timeline}>
        {visibleEntries.map((entry) => {
          const described = describeActivity(entry.action, entry.details);
          return (
            <div key={entry.id} className={styles.entry}>
              <div className={styles.entryAvatar}>
                <Avatar name={entry.userDisplayName} src={entry.userAvatarPath} size="sm" />
              </div>
              <div className={styles.entryContent}>
                {described.text !== null ? (
                  <div className={styles.entryText}>
                    <span className={styles.entryUser}>{entry.userDisplayName}</span>
                    {' '}
                    <span className={styles.entryAction}>{described.text}</span>
                  </div>
                ) : (
                  <div className={styles.entryText}>
                    <span className={styles.entryUser}>{entry.userDisplayName}</span>
                  </div>
                )}
                {described.preview && (
                  <div className={styles.previewBox}>
                    {described.preview.icon && (
                      <span className={styles.previewIcon}>{described.preview.icon}</span>
                    )}
                    <span className={styles.previewContent}>{described.preview.content}</span>
                  </div>
                )}
                {described.diff && (
                  <div className={styles.diffBox}>
                    {described.diff.icon && (
                      <span className={styles.previewIcon}>{described.diff.icon}</span>
                    )}
                    <span className={styles.diffContent}>
                      {diffWords(described.diff.oldText, described.diff.newText).map((part, i) => {
                        if (part.type === 'same') return <span key={i}>{part.text}</span>;
                        if (part.type === 'added') return <span key={i} className={styles.diffAdded}>{part.text}</span>;
                        return <span key={i} className={styles.diffRemoved}>{part.text}</span>;
                      })}
                    </span>
                  </div>
                )}
                <div className={styles.entryTimestamp}>{timeAgo(entry.createdAt)}</div>
              </div>
            </div>
          );
        })}
      </div>
      {hiddenCount > 0 && (
        <button type="button" className={styles.expandButton} onClick={() => setExpanded(true)}>
          Show {hiddenCount} older {hiddenCount === 1 ? 'entry' : 'entries'}
        </button>
      )}
      {expanded && entries.length > INITIAL_LIMIT && (
        <button type="button" className={styles.expandButton} onClick={() => setExpanded(false)}>
          Collapse history
        </button>
      )}
    </div>
  );
}
