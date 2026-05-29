import { useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '../stores/project.store';
import { useNotificationStore } from '../stores/notification.store';
import * as statsApi from '../api/stats.api';
import type { UserTask, DashboardStats } from '../api/stats.api';

const EMPTY_STATS: DashboardStats = {
  totalTasks: 0,
  completed: 0,
  inProgress: 0,
  notifications: 0,
};

interface UseDashboardDataResult {
  stats: DashboardStats;
  userTasks: UserTask[];
  refresh: () => Promise<void>;
}

export function useDashboardData(): UseDashboardDataResult {
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const fetchAllBoards = useProjectStore((s) => s.fetchAllBoards);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      setStats(await statsApi.getDashboardStats());
    } catch {
      // Stats are non-critical; previous value kept
    }
  }, []);

  const fetchUserTasks = useCallback(async () => {
    try {
      setUserTasks(await statsApi.getUserTasks());
    } catch {
      // Tasks are non-critical; previous value kept
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchProjects();
    await fetchAllBoards();
    fetchNotifications();
    fetchStats();
    fetchUserTasks();
  }, [fetchProjects, fetchAllBoards, fetchNotifications, fetchStats, fetchUserTasks]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, userTasks, refresh };
}
