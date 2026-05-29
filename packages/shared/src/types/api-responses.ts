// API response shapes for joined / enriched views returned by the server.
// These complement the canonical entity types in `./index.ts` — entities describe
// what is stored, these describe what comes back over the wire.

import type { Board, Column, Comment, Notification, TaskPriority } from "./index.js";

// -- Activity --

export interface ActivityEntry {
  id: string;
  projectId: string;
  taskId: string | null;
  userId: string;
  action: string;
  details: string | null;
  createdAt: string;
}

// -- API keys --

export interface ApiKeyPublic {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ApiKeyCreateResponse {
  key: ApiKeyPublic;
  rawKey: string;
}

// -- Boards --

export interface BoardWithColumns extends Board {
  columns: Column[];
}

// -- Comments --

export interface CommentAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
}

export interface CommentWithAuthor extends Comment {
  author: CommentAuthor;
}

// -- Custom fields --

export type CustomFieldType = "dropdown" | "checklist" | "text_small" | "text_large";

export interface CustomField {
  id: string;
  projectId: string;
  name: string;
  type: CustomFieldType;
  options: string[] | null;
  position: number;
  showOnCard: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCustomValue {
  id: string;
  taskId: string;
  fieldId: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCustomBadge {
  fieldName: string;
  value: string;
}

// -- Links --

export interface TaskLink {
  id: string;
  taskId: string;
  url: string;
  createdAt: string;
  createdBy: string | null;
}

// -- Notifications --

export interface NotificationsListResponse {
  data: Notification[];
  unreadCount: number;
}

// -- OAuth --

export interface OAuthClient {
  id: string;
  name: string;
  redirectUris: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
}

export interface OAuthClientCreateResult {
  client: OAuthClient;
  clientSecret: string | null;
}

// -- Project members --

export interface ProjectMemberUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
}

export interface ProjectMemberWithUser {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user?: ProjectMemberUser;
}

// -- Registration --

export interface RegistrationStatus {
  enabled: boolean;
}

// -- Settings --

export interface AppSettings {
  registrationEnabled: boolean;
}

// -- Stats --

export interface DashboardStats {
  totalTasks: number;
  completed: number;
  inProgress: number;
  notifications: number;
}

export interface UserTask {
  id: string;
  title: string;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  columnId: string;
  columnName: string;
  columnColor: string;
  boardId: string;
  boardName: string;
  projectId: string;
  createdAt: string;
}

// -- Tasks (joined views) --

// Server returns labels in the joined shape: `labelId` rather than `id`,
// plus the label's `name` and `color` flattened in.
export interface TaskLabelView {
  labelId: string;
  name: string;
  color: string;
}

// Same idea for assignees: `userId` (the join key) plus the user's display info.
export interface TaskAssigneeView {
  userId: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
}

export interface TaskWithRelations {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  position: number;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;

  labels: TaskLabelView[];
  assignees: TaskAssigneeView[];
  commentCount: number;
  checklistTotal: number;
  checklistCompleted: number;
  attachmentCount: number;
  linkCount: number;
  customBadges?: TaskCustomBadge[];
}

export type BoardTasks = Record<string, TaskWithRelations[]>;

export interface TaskContext {
  taskId: string;
  boardId: string;
  projectId: string;
}

export interface BulkTaskResult {
  moved?: number;
  duplicated?: number;
  affectedBoardIds: string[];
}
