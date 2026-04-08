import type { ApiSuccessResponse, Attachment } from '@pileo/shared';
import { apiClient } from './client';
import { ApiRequestError } from './client';

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

  const url = `/api/v1/tasks/${taskId}/attachments`;

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({
      error: { code: 'UNKNOWN_ERROR', message: response.statusText },
    }));
    throw new ApiRequestError(response.status, body.error);
  }

  const result = (await response.json()) as ApiSuccessResponse<Attachment>;
  return result.data;
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await apiClient.delete(`/attachments/${attachmentId}`);
}

export function getDownloadUrl(attachmentId: string): string {
  return `/api/v1/attachments/${attachmentId}/download`;
}
