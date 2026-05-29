import { useEffect, useState } from 'react';
import * as shareApi from '../api/share.api';

interface SharedColumn {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  position: number;
}

interface SharedTask {
  id: string;
  title: string;
  description: string | null;
  position: number;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  labels: Array<{ name: string; color: string }>;
}

export interface SharedBoardData {
  board: { id: string; name: string };
  columns: SharedColumn[];
  tasksByColumn: Record<string, SharedTask[]>;
}

interface UseSharedBoardResult {
  data: SharedBoardData | null;
  error: boolean;
  viewerCount: number;
}

export function useSharedBoard(token: string | undefined): UseSharedBoardResult {
  const [data, setData] = useState<SharedBoardData | null>(null);
  const [error, setError] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    shareApi
      .getSharedBoard(token)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const es = new EventSource(`/api/v1/shared/${token}/viewers`);
    es.onmessage = (event) => {
      try {
        const { count } = JSON.parse(event.data);
        setViewerCount(count);
      } catch {
        // Malformed SSE payload — ignore
      }
    };
    return () => es.close();
  }, [token]);

  return { data, error, viewerCount };
}
