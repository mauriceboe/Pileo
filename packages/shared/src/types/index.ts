import { z } from "zod";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  userSchema,
  userPublicSchema,
  updateUserSchema,
  changePasswordSchema,
  adminCreateUserSchema,
  adminUpdateRoleSchema,
  projectSchema,
  createProjectSchema,
  updateProjectSchema,
  projectMemberSchema,
  addProjectMemberSchema,
  addProjectMemberByEmailSchema,
  updateProjectMemberSchema,
  boardSchema,
  createBoardSchema,
  updateBoardSchema,
  reorderColumnsSchema,
  columnSchema,
  createColumnSchema,
  updateColumnSchema,
  taskSchema,
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  bulkTaskOperationSchema,
  updateTaskAssigneesSchema,
  updateTaskLabelsSchema,
  taskAssigneeSchema,
  taskLabelSchema,
  commentSchema,
  createCommentSchema,
  updateCommentSchema,
  labelSchema,
  createLabelSchema,
  updateLabelSchema,
  checklistItemSchema,
  createChecklistItemSchema,
  updateChecklistItemSchema,
  reorderChecklistSchema,
  attachmentSchema,
  notificationSchema,
  markNotificationReadSchema,
} from "../schemas/index.js";
import {
  USER_ROLES,
  PROJECT_MEMBER_ROLES,
  TASK_PRIORITIES,
  NOTIFICATION_TYPES,
  NOTIFICATION_RESOURCE_TYPES,
} from "../constants/index.js";

// -- Auth Types --
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// -- User Types --
export type User = z.infer<typeof userSchema>;
export type UserPublic = z.infer<typeof userPublicSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserRole = (typeof USER_ROLES)[number];
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateRoleInput = z.infer<typeof adminUpdateRoleSchema>;

// -- Project Types --
export type Project = z.infer<typeof projectSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectMember = z.infer<typeof projectMemberSchema>;
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
export type AddProjectMemberByEmailInput = z.infer<typeof addProjectMemberByEmailSchema>;
export type UpdateProjectMemberInput = z.infer<typeof updateProjectMemberSchema>;
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];

// -- Board Types --
export type Board = z.infer<typeof boardSchema>;
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type ReorderColumnsInput = z.infer<typeof reorderColumnsSchema>;

// -- Column Types --
export type Column = z.infer<typeof columnSchema>;
export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;

// -- Task Types --
export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type BulkTaskOperationInput = z.infer<typeof bulkTaskOperationSchema>;
export type UpdateTaskAssigneesInput = z.infer<typeof updateTaskAssigneesSchema>;
export type UpdateTaskLabelsInput = z.infer<typeof updateTaskLabelsSchema>;
export type TaskAssignee = z.infer<typeof taskAssigneeSchema>;
export type TaskLabel = z.infer<typeof taskLabelSchema>;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// -- Comment Types --
export type Comment = z.infer<typeof commentSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

// -- Label Types --
export type Label = z.infer<typeof labelSchema>;
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;

// -- Checklist Types --
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
export type ReorderChecklistInput = z.infer<typeof reorderChecklistSchema>;

// -- Attachment Types --
export type Attachment = z.infer<typeof attachmentSchema>;

// -- Notification Types --
export type Notification = z.infer<typeof notificationSchema>;
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationResourceType = (typeof NOTIFICATION_RESOURCE_TYPES)[number];

// -- API Response Envelopes --
export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
