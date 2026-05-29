import type {
  ApiSuccessResponse,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectMember,
  ProjectMemberWithUser,
  AddProjectMemberInput,
  AddProjectMemberByEmailInput,
  UpdateProjectMemberInput,
} from '@pileo/shared';
import { apiClient } from './client';

export async function listProjects(): Promise<Project[]> {
  const response = await apiClient.get<ApiSuccessResponse<Project[]>>('/projects');
  return response.data;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const response = await apiClient.post<ApiSuccessResponse<Project>>(
    '/projects',
    input,
  );
  return response.data;
}

export async function getProject(projectId: string): Promise<Project> {
  const response = await apiClient.get<ApiSuccessResponse<Project>>(
    `/projects/${projectId}`,
  );
  return response.data;
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
): Promise<Project> {
  const response = await apiClient.patch<ApiSuccessResponse<Project>>(
    `/projects/${projectId}`,
    input,
  );
  return response.data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}`);
}

export async function listMembers(projectId: string): Promise<ProjectMemberWithUser[]> {
  const response = await apiClient.get<ApiSuccessResponse<ProjectMemberWithUser[]>>(
    `/projects/${projectId}/members`,
  );
  return response.data;
}

export async function addMember(
  projectId: string,
  input: AddProjectMemberInput | AddProjectMemberByEmailInput,
): Promise<ProjectMemberWithUser> {
  const response = await apiClient.post<ApiSuccessResponse<ProjectMemberWithUser>>(
    `/projects/${projectId}/members`,
    input,
  );
  return response.data;
}

export async function updateMemberRole(
  projectId: string,
  userId: string,
  input: UpdateProjectMemberInput,
): Promise<ProjectMember> {
  const response = await apiClient.patch<ApiSuccessResponse<ProjectMember>>(
    `/projects/${projectId}/members/${userId}`,
    input,
  );
  return response.data;
}

export async function removeMember(
  projectId: string,
  userId: string,
): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/members/${userId}`);
}

export async function uploadBackground(
  projectId: string,
  file: File,
): Promise<Project> {
  const formData = new FormData();
  formData.append('background', file);
  const response = await apiClient.upload<ApiSuccessResponse<Project>>(
    `/projects/${projectId}/background`,
    formData,
    'PATCH',
  );
  return response.data;
}
