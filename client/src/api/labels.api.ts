import type {
  ApiSuccessResponse,
  Label,
  CreateLabelInput,
  UpdateLabelInput,
} from '@pileo/shared';
import { apiClient } from './client';

export async function listLabels(projectId: string): Promise<Label[]> {
  const response = await apiClient.get<ApiSuccessResponse<Label[]>>(
    `/projects/${projectId}/labels`,
  );
  return response.data;
}

export async function createLabel(
  projectId: string,
  input: CreateLabelInput,
): Promise<Label> {
  const response = await apiClient.post<ApiSuccessResponse<Label>>(
    `/projects/${projectId}/labels`,
    input,
  );
  return response.data;
}

export async function updateLabel(
  labelId: string,
  input: UpdateLabelInput,
): Promise<Label> {
  const response = await apiClient.patch<ApiSuccessResponse<Label>>(
    `/labels/${labelId}`,
    input,
  );
  return response.data;
}

export async function deleteLabel(labelId: string): Promise<void> {
  await apiClient.delete(`/labels/${labelId}`);
}
