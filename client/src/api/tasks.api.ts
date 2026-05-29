import type {
  ApiSuccessResponse,
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
  UpdateTaskAssigneesInput,
  UpdateTaskLabelsInput,
  TaskWithRelations,
  TaskLabelView,
  TaskAssigneeView,
  TaskContext,
  BoardTasks,
  BulkTaskResult,
} from '@pileo/shared';
import { apiClient } from './client';

export type {
  TaskWithRelations,
  TaskLabelView,
  TaskAssigneeView,
  TaskContext,
  BoardTasks,
  BulkTaskResult,
};

export async function listTasks(boardId: string): Promise<BoardTasks> {
  const response = await apiClient.get<ApiSuccessResponse<BoardTasks>>(
    `/boards/${boardId}/tasks`,
  );
  return response.data;
}

export async function createTask(
  columnId: string,
  input: CreateTaskInput,
): Promise<TaskWithRelations> {
  const response = await apiClient.post<ApiSuccessResponse<TaskWithRelations>>(
    `/columns/${columnId}/tasks`,
    input,
  );
  return response.data;
}

export async function getTaskContext(taskId: string): Promise<TaskContext> {
  const response = await apiClient.get<ApiSuccessResponse<TaskContext>>(
    `/tasks/${taskId}/context`,
  );
  return response.data;
}

export async function getTask(taskId: string): Promise<TaskWithRelations> {
  const response = await apiClient.get<ApiSuccessResponse<TaskWithRelations>>(
    `/tasks/${taskId}`,
  );
  return response.data;
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
): Promise<TaskWithRelations> {
  const response = await apiClient.patch<ApiSuccessResponse<TaskWithRelations>>(
    `/tasks/${taskId}`,
    input,
  );
  return response.data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}`);
}

export async function moveTask(
  taskId: string,
  input: MoveTaskInput,
): Promise<void> {
  await apiClient.patch(`/tasks/${taskId}/move`, input);
}

export async function bulkMoveTasks(
  taskIds: string[],
  targetColumnId: string,
): Promise<BulkTaskResult> {
  const response = await apiClient.post<ApiSuccessResponse<BulkTaskResult>>(
    `/tasks/bulk-move`,
    { taskIds, targetColumnId },
  );
  return response.data;
}

export async function bulkDuplicateTasks(
  taskIds: string[],
  targetColumnId: string,
): Promise<BulkTaskResult> {
  const response = await apiClient.post<ApiSuccessResponse<BulkTaskResult>>(
    `/tasks/bulk-duplicate`,
    { taskIds, targetColumnId },
  );
  return response.data;
}

export async function updateAssignees(
  taskId: string,
  input: UpdateTaskAssigneesInput,
): Promise<TaskWithRelations> {
  const response = await apiClient.patch<ApiSuccessResponse<TaskWithRelations>>(
    `/tasks/${taskId}/assignees`,
    input,
  );
  return response.data;
}

export async function updateLabels(
  taskId: string,
  input: UpdateTaskLabelsInput,
): Promise<TaskWithRelations> {
  const response = await apiClient.patch<ApiSuccessResponse<TaskWithRelations>>(
    `/tasks/${taskId}/labels`,
    input,
  );
  return response.data;
}
