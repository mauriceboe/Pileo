import { z } from "zod";
import { TASK_PRIORITIES } from "../constants/index.js";

export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export const taskSchema = z.object({
  id: z.string().uuid(),
  columnId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).nullable(),
  position: z.number().int().min(0),
  priority: taskPrioritySchema,
  dueDate: z.string().nullable(),
  completedAt: z.string().nullable(),
  creatorId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Task title is required")
    .max(500, "Task title must be at most 500 characters")
    .trim(),
  description: z.string().max(10000).trim().nullable().optional(),
  priority: taskPrioritySchema.optional().default("none"),
  dueDate: z.coerce.date().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  description: z.string().max(10000).trim().nullable().optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
});

export const moveTaskSchema = z.object({
  columnId: z.string().uuid(),
  position: z.number().int().min(0),
});

export const updateTaskAssigneesSchema = z.object({
  add: z.array(z.string().uuid()).optional().default([]),
  remove: z.array(z.string().uuid()).optional().default([]),
});

export const updateTaskLabelsSchema = z.object({
  add: z.array(z.string().uuid()).optional().default([]),
  remove: z.array(z.string().uuid()).optional().default([]),
});

export const taskAssigneeSchema = z.object({
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const taskLabelSchema = z.object({
  taskId: z.string().uuid(),
  labelId: z.string().uuid(),
});
