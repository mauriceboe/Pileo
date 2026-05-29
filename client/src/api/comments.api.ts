import type {
  ApiSuccessResponse,
  CommentWithAuthor,
  CreateCommentInput,
  UpdateCommentInput,
} from '@pileo/shared';
import { apiClient } from './client';

export type { CommentWithAuthor };

export async function listComments(taskId: string): Promise<CommentWithAuthor[]> {
  const response = await apiClient.get<ApiSuccessResponse<CommentWithAuthor[]>>(
    `/tasks/${taskId}/comments`,
  );
  return response.data;
}

export async function createComment(
  taskId: string,
  input: CreateCommentInput,
): Promise<CommentWithAuthor> {
  const response = await apiClient.post<ApiSuccessResponse<CommentWithAuthor>>(
    `/tasks/${taskId}/comments`,
    input,
  );
  return response.data;
}

export async function updateComment(
  commentId: string,
  input: UpdateCommentInput,
): Promise<CommentWithAuthor> {
  const response = await apiClient.patch<ApiSuccessResponse<CommentWithAuthor>>(
    `/comments/${commentId}`,
    input,
  );
  return response.data;
}

export async function deleteComment(commentId: string): Promise<void> {
  await apiClient.delete(`/comments/${commentId}`);
}
