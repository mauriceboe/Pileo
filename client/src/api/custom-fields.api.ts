import type { ApiSuccessResponse, CustomField, CustomFieldType, TaskCustomValue } from '@pileo/shared';
import { apiClient } from './client';

export type { CustomField, CustomFieldType, TaskCustomValue };

export async function listFields(projectId: string): Promise<CustomField[]> {
  const res = await apiClient.get<ApiSuccessResponse<CustomField[]>>(`/projects/${projectId}/custom-fields`);
  return res.data;
}

export async function createField(projectId: string, data: {
  name: string;
  type: CustomFieldType;
  options?: string[];
  showOnCard?: boolean;
}): Promise<CustomField> {
  const res = await apiClient.post<ApiSuccessResponse<CustomField>>(`/projects/${projectId}/custom-fields`, data);
  return res.data;
}

export async function updateField(fieldId: string, data: Partial<{
  name: string;
  type: CustomFieldType;
  options: string[];
  showOnCard: boolean;
  isEnabled: boolean;
}>): Promise<CustomField> {
  const res = await apiClient.patch<ApiSuccessResponse<CustomField>>(`/custom-fields/${fieldId}`, data);
  return res.data;
}

export async function deleteField(fieldId: string): Promise<void> {
  await apiClient.delete(`/custom-fields/${fieldId}`);
}

export async function getTaskValues(taskId: string): Promise<TaskCustomValue[]> {
  const res = await apiClient.get<ApiSuccessResponse<TaskCustomValue[]>>(`/tasks/${taskId}/custom-values`);
  return res.data;
}

export async function setTaskValue(taskId: string, fieldId: string, value: string): Promise<TaskCustomValue> {
  const res = await apiClient.put<ApiSuccessResponse<TaskCustomValue>>(`/tasks/${taskId}/custom-values/${fieldId}`, { value });
  return res.data;
}

export async function deleteTaskValue(taskId: string, fieldId: string): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}/custom-values/${fieldId}`);
}
