import { z } from "zod";
import { HEX_COLOR_REGEX } from "../constants/index.js";

export const columnSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: z.string().regex(HEX_COLOR_REGEX, "Invalid hex color code"),
  icon: z.string().max(50).nullable(),
  position: z.number().int().min(0),
  isCompleted: z.boolean().default(false),
  taskLimit: z.number().int().min(1).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createColumnSchema = z.object({
  name: z
    .string()
    .min(1, "Column name is required")
    .max(100, "Column name must be at most 100 characters")
    .trim(),
  color: z.string().regex(HEX_COLOR_REGEX, "Invalid hex color code").optional(),
  icon: z.string().max(50).nullable().optional(),
  isCompleted: z.boolean().optional(),
  taskLimit: z.number().int().min(1).nullable().optional(),
});

export const updateColumnSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  color: z.string().regex(HEX_COLOR_REGEX, "Invalid hex color code").optional(),
  icon: z.string().max(50).nullable().optional(),
  position: z.number().int().min(0).optional(),
  isCompleted: z.boolean().optional(),
  taskLimit: z.number().int().min(1).nullable().optional(),
});
