import { z } from "zod";
import { PROJECT_MEMBER_ROLES } from "../constants/index.js";

export const projectMemberRoleSchema = z.enum(PROJECT_MEMBER_ROLES);

export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().max(1000).nullable(),
  icon: z.string().max(50).nullable(),
  backgroundImage: z.string().nullable(),
  ownerId: z.string().uuid(),
  isArchived: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be at most 100 characters")
    .trim(),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .trim()
    .nullable()
    .optional(),
  icon: z.string().max(50).nullable().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(1000).trim().nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  backgroundImage: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
});

export const projectMemberSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: projectMemberRoleSchema,
  joinedAt: z.string(),
});

export const addProjectMemberSchema = z.object({
  userId: z.string().uuid(),
  role: projectMemberRoleSchema.default("member"),
});

export const addProjectMemberByEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: projectMemberRoleSchema.default("member"),
});

export const updateProjectMemberSchema = z.object({
  role: projectMemberRoleSchema,
});
