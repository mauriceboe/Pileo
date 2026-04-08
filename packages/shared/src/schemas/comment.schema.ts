import { z } from "zod";

export const commentSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  authorId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(10000, "Comment must be at most 10000 characters")
    .trim(),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(10000, "Comment must be at most 10000 characters")
    .trim(),
});
