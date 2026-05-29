import { useCallback, useEffect, useState } from 'react';
import * as activityApi from '../api/activity.api';
import { useBoardStore } from '../stores/board.store';

export interface ActivityEntry {
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

interface UseTaskActivityResult {
  entries: ActivityEntry[];
  isLoading: boolean;
}

export function useTaskActivity(taskId: string): UseTaskActivityResult {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Refresh activity whenever the task itself changes (title/description/assignees/etc.)
  const taskUpdatedAt = useBoardStore((state) => state.selectedTask?.updatedAt);

  const fetchActivity = useCallback(async () => {
    try {
      const data = await activityApi.getTaskActivity(taskId);
      setEntries(data as ActivityEntry[]);
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity, taskUpdatedAt]);

  return { entries, isLoading };
}
