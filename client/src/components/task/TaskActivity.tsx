import { useState, useEffect, useCallback } from 'react';
import { Avatar } from '../ui/Avatar';
import { apiClient } from '../../api/client';
import type { ApiSuccessResponse } from '@pileo/shared';
import styles from './task-activity.module.css';

interface ActivityEntry {
  id: string;
  projectId: string;
  taskId: string | null;
  userId: string;
  action: string;
  details: string | null;
  createdAt: string;
  userDisplayName: string;
  userAvatarPath: string | null;
}

interface TaskActivityProps {
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

function describeAction(action: string, details: string | null): string {
  const parsed = details ? JSON.parse(details) as Record<string, unknown> : null;

  switch (action) {
    case 'task.created':
      return 'created this task';
    case 'task.updated': {
      if (!parsed) return 'updated this task';
      const changes: string[] = [];
      if (parsed.title) changes.push('title');
      if (parsed.description) changes.push('description');
      if (parsed.priority) changes.push('priority');
      if (parsed.dueDate) changes.push('due date');
      return changes.length > 0
        ? `updated ${changes.join(', ')}`
        : 'updated this task';
    }
    case 'task.moved': {
      if (!parsed) return 'moved this task';
      if (parsed.oldColumn && parsed.newColumn) {
        return `moved task from ${String(parsed.oldColumn)} to ${String(parsed.newColumn)}`;
      }
      return 'reordered this task';
    }
    case 'task.deleted':
      return 'deleted a task';
    case 'task.assignees.updated':
      return 'updated assignees';
    case 'task.labels.updated':
      return 'updated labels';
    case 'comment.created':
      return 'added a comment';
    case 'attachment.uploaded': {
      const fileName = parsed?.fileName;
      return fileName ? `uploaded "${String(fileName)}"` : 'uploaded a file';
    }
    case 'attachment.deleted': {
      const fileName = parsed?.fileName;
      return fileName ? `removed "${String(fileName)}"` : 'removed a file';
    }
    default:
      return action.replace(/\./g, ' ');
  }
}

export function TaskActivity({ taskId }: TaskActivityProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const response = await apiClient.get<ApiSuccessResponse<ActivityEntry[]>>(
        `/tasks/${taskId}/activity`,
      );
      setEntries(response.data);
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  if (isLoading) {
    return null;
  }

  if (entries.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.emptyMessage}>No activity yet</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.timeline}>
        {entries.map((entry) => (
          <div key={entry.id} className={styles.entry}>
            <div className={styles.entryAvatar}>
              <Avatar
                name={entry.userDisplayName}
                src={entry.userAvatarPath}
                size="sm"
              />
            </div>
            <div className={styles.entryContent}>
              <div className={styles.entryText}>
                <span className={styles.entryUser}>
                  {entry.userDisplayName}
                </span>
                {' '}
                <span className={styles.entryAction}>
                  {describeAction(entry.action, entry.details)}
                </span>
              </div>
              <div className={styles.entryTimestamp}>
                {formatTimestamp(entry.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
