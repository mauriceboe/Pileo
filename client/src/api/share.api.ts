import type { ApiSuccessResponse } from '@pileo/shared';
import { apiClient } from './client';

interface ShareLinkInfo {
  token: string;
  createdAt: string;
}

interface SharedBoardData {
  board: { id: string; name: string };
  columns: Array<{
    id: string;
    name: string;
    color: string;
    icon: string | null;
    position: number;
  }>;
  tasksByColumn: Record<string, Array<{ id: string; title: string; description: string | null; position: number; priority: string; dueDate: string | null; completedAt: string | null; labels: Array<{ name: string; color: string }> }>>;
}

export async function createShareLink(boardId: string): Promise<string> {
  const response = await apiClient.post<ApiSuccessResponse<{ token: string }>>(
    `/boards/${boardId}/share-link`,
  );
  return response.data.token;
}

export async function getShareLink(boardId: string): Promise<ShareLinkInfo | null> {
  const response = await apiClient.get<ApiSuccessResponse<ShareLinkInfo | null>>(
    `/boards/${boardId}/share-link`,
  );
  return response.data;
}

export async function deleteShareLink(boardId: string): Promise<void> {
  await apiClient.delete(`/boards/${boardId}/share-link`);
}

export async function getSharedBoard(token: string): Promise<SharedBoardData> {
  const response = await fetch(`/api/v1/shared/${token}`);
  if (!response.ok) {
    throw new Error('Invalid or expired link');
  }
  const body = await response.json();
  return body.data;
}
