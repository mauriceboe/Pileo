import type {
  ApiSuccessResponse,
  ChecklistItem,
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
  ReorderChecklistInput,
} from '@pileo/shared';
import { apiClient } from './client';

export async function listChecklistItems(taskId: string): Promise<ChecklistItem[]> {
  const response = await apiClient.get<ApiSuccessResponse<ChecklistItem[]>>(
    `/tasks/${taskId}/checklist`,
  );
  return response.data;
}

export async function createChecklistItem(
  taskId: string,
  input: CreateChecklistItemInput,
): Promise<ChecklistItem> {
  const response = await apiClient.post<ApiSuccessResponse<ChecklistItem>>(
    `/tasks/${taskId}/checklist`,
    input,
  );
  return response.data;
}

export async function updateChecklistItem(
  itemId: string,
  input: UpdateChecklistItemInput,
): Promise<ChecklistItem> {
  const response = await apiClient.patch<ApiSuccessResponse<ChecklistItem>>(
    `/checklist/${itemId}`,
    input,
  );
  return response.data;
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  await apiClient.delete(`/checklist/${itemId}`);
}

export async function reorderChecklistItems(
  taskId: string,
  input: ReorderChecklistInput,
): Promise<ChecklistItem[]> {
  const response = await apiClient.patch<ApiSuccessResponse<ChecklistItem[]>>(
    `/tasks/${taskId}/checklist/reorder`,
    input,
  );
  return response.data;
}
