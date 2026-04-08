import { z } from "zod";
import { HEX_COLOR_REGEX } from "../constants/index.js";

export const labelSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(50),
  color: z.string().regex(HEX_COLOR_REGEX, "Invalid hex color code"),
});

export const createLabelSchema = z.object({
  name: z
    .string()
    .min(1, "Label name is required")
    .max(50, "Label name must be at most 50 characters")
    .trim(),
  color: z.string().regex(HEX_COLOR_REGEX, "Invalid hex color code"),
});

export const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  color: z.string().regex(HEX_COLOR_REGEX, "Invalid hex color code").optional(),
});
