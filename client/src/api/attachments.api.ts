import type { ApiSuccessResponse, Attachment } from '@pileo/shared';
import { apiClient } from './client';

export async function listAttachments(taskId: string): Promise<Attachment[]> {
  const response = await apiClient.get<ApiSuccessResponse<Attachment[]>>(
    `/tasks/${taskId}/attachments`,
  );
  return response.data;
}

export async function uploadAttachment(
  taskId: string,
  file: File,
): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.upload<ApiSuccessResponse<Attachment>>(
    `/tasks/${taskId}/attachments`,
    formData,
  );
  return response.data;
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await apiClient.delete(`/attachments/${attachmentId}`);
}

export function getDownloadUrl(attachmentId: string): string {
  return `/api/v1/attachments/${attachmentId}/download`;
}
