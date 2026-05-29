import type {
  ApiSuccessResponse,
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  RegistrationStatus,
  UserPublic,
} from '@pileo/shared';
import { apiClient } from './client';

export async function login(input: LoginInput): Promise<UserPublic> {
  const response = await apiClient.post<ApiSuccessResponse<UserPublic>>(
    '/auth/login',
    input,
  );
  return response.data;
}

export async function register(input: RegisterInput): Promise<UserPublic> {
  const response = await apiClient.post<ApiSuccessResponse<UserPublic>>(
    '/auth/register',
    input,
  );
  return response.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  await apiClient.post('/auth/forgot-password', input);
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  await apiClient.post('/auth/reset-password', input);
}

export async function getCurrentUser(): Promise<UserPublic> {
  const response = await apiClient.get<ApiSuccessResponse<UserPublic>>(
    '/auth/me',
  );
  return response.data;
}

export async function getRegistrationStatus(): Promise<RegistrationStatus> {
  const response = await apiClient.get<ApiSuccessResponse<RegistrationStatus>>(
    '/auth/registration-status',
  );
  return response.data;
}
