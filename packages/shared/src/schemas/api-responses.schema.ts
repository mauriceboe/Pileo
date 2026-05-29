import { z } from "zod";
import { taskPrioritySchema, taskSchema } from "./task.schema.js";
import { boardSchema } from "./board.schema.js";
import { columnSchema } from "./column.schema.js";
import { commentSchema } from "./comment.schema.js";

// Runtime schemas for the enriched / joined views the server returns. Pairing
// them with the types in ../types/api-responses.ts means dev-mode `.parse()`
// catches a contract regression immediately instead of letting the wrong shape
// reach the client.

export const taskLabelViewSchema = z.object({
  labelId: z.string().uuid(),
  name: z.string(),
  color: z.string(),
});

export const taskAssigneeViewSchema = z.object({
  userId: z.string().uuid(),
  username: z.string(),
  displayName: z.string(),
  avatarPath: z.string().nullable(),
});

export const taskCustomBadgeSchema = z.object({
  fieldName: z.string(),
  value: z.string(),
});

export const taskWithRelationsSchema = taskSchema.extend({
  labels: z.array(taskLabelViewSchema),
  assignees: z.array(taskAssigneeViewSchema),
  commentCount: z.number().int().min(0),
  checklistTotal: z.number().int().min(0),
  checklistCompleted: z.number().int().min(0),
  attachmentCount: z.number().int().min(0),
  linkCount: z.number().int().min(0),
  customBadges: z.array(taskCustomBadgeSchema).optional(),
});

export const boardTasksSchema = z.record(z.string(), z.array(taskWithRelationsSchema));

export const taskContextSchema = z.object({
  taskId: z.string().uuid(),
  boardId: z.string().uuid(),
  projectId: z.string().uuid(),
});

export const bulkTaskResultSchema = z.object({
  moved: z.number().int().min(0).optional(),
  duplicated: z.number().int().min(0).optional(),
  affectedBoardIds: z.array(z.string().uuid()),
});

export const boardWithColumnsSchema = boardSchema.extend({
  columns: z.array(columnSchema),
});

export const commentAuthorSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  displayName: z.string(),
  avatarPath: z.string().nullable(),
});

export const commentWithAuthorSchema = commentSchema.extend({
  author: commentAuthorSchema,
});

export const dashboardStatsSchema = z.object({
  totalTasks: z.number().int().min(0),
  completed: z.number().int().min(0),
  inProgress: z.number().int().min(0),
  notifications: z.number().int().min(0),
});

export const userTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  priority: taskPrioritySchema,
  dueDate: z.string().nullable(),
  completedAt: z.string().nullable(),
  columnId: z.string().uuid(),
  columnName: z.string(),
  columnColor: z.string(),
  boardId: z.string().uuid(),
  boardName: z.string(),
  projectId: z.string().uuid(),
  createdAt: z.string(),
});

export const projectMemberUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  displayName: z.string(),
  avatarPath: z.string().nullable(),
});

export const projectMemberWithUserSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string(),
  joinedAt: z.string(),
  user: projectMemberUserSchema.optional(),
});

export const registrationStatusSchema = z.object({
  enabled: z.boolean(),
});

export const appSettingsSchema = z.object({
  registrationEnabled: z.boolean(),
});
