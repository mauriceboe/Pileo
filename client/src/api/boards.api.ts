import type {
  ApiSuccessResponse,
  Board,
  BoardWithColumns,
  CreateBoardInput,
  UpdateBoardInput,
  Column,
  CreateColumnInput,
  UpdateColumnInput,
  ReorderColumnsInput,
} from '@pileo/shared';
import { apiClient } from './client';

export type { BoardWithColumns };

export async function listBoards(projectId: string): Promise<Board[]> {
  const response = await apiClient.get<ApiSuccessResponse<Board[]>>(
    `/projects/${projectId}/boards`,
  );
  return response.data;
}

export async function createBoard(
  projectId: string,
  input: CreateBoardInput,
): Promise<Board> {
  const response = await apiClient.post<ApiSuccessResponse<Board>>(
    `/projects/${projectId}/boards`,
    input,
  );
  return response.data;
}

export async function getBoard(boardId: string): Promise<BoardWithColumns> {
  const response = await apiClient.get<ApiSuccessResponse<BoardWithColumns>>(
    `/boards/${boardId}`,
  );
  return response.data;
}

export async function updateBoard(
  boardId: string,
  input: UpdateBoardInput,
): Promise<Board> {
  const response = await apiClient.patch<ApiSuccessResponse<Board>>(
    `/boards/${boardId}`,
    input,
  );
  return response.data;
}

export async function deleteBoard(boardId: string): Promise<void> {
  await apiClient.delete(`/boards/${boardId}`);
}

export async function createColumn(
  boardId: string,
  input: CreateColumnInput,
): Promise<Column> {
  const response = await apiClient.post<ApiSuccessResponse<Column>>(
    `/boards/${boardId}/columns`,
    input,
  );
  return response.data;
}

export async function updateColumn(
  columnId: string,
  input: UpdateColumnInput,
): Promise<Column> {
  const response = await apiClient.patch<ApiSuccessResponse<Column>>(
    `/columns/${columnId}`,
    input,
  );
  return response.data;
}

export async function deleteColumn(columnId: string): Promise<void> {
  await apiClient.delete(`/columns/${columnId}`);
}

export async function reorderColumns(
  boardId: string,
  input: ReorderColumnsInput,
): Promise<void> {
  await apiClient.patch(`/boards/${boardId}/reorder`, input);
}
