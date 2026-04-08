import { z } from "zod";

export const boardSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  position: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createBoardSchema = z.object({
  name: z
    .string()
    .min(1, "Board name is required")
    .max(100, "Board name must be at most 100 characters")
    .trim(),
});

export const updateBoardSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  position: z.number().int().min(0).optional(),
});

export const reorderColumnsSchema = z.object({
  columnIds: z.array(z.string().uuid()).min(1, "At least one column ID is required"),
});
