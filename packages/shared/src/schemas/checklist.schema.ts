import { z } from "zod";

export const checklistItemSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  title: z.string().min(1).max(500),
  isCompleted: z.boolean().default(false),
  position: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createChecklistItemSchema = z.object({
  title: z
    .string()
    .min(1, "Checklist item title is required")
    .max(500, "Checklist item title must be at most 500 characters")
    .trim(),
});

export const updateChecklistItemSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  isCompleted: z.boolean().optional(),
});

export const reorderChecklistSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1, "At least one item ID is required"),
});
