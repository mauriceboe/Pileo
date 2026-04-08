import { z } from "zod";
import { USER_ROLES } from "../constants/index.js";

export const userRoleSchema = z.enum(USER_ROLES);

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().toLowerCase(),
  username: z.string().min(3).max(39).toLowerCase(),
  displayName: z.string().min(1).max(100),
  passwordHash: z.string(),
  avatarPath: z.string().nullable(),
  role: userRoleSchema,
  emailVerified: z.boolean().default(false),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const userPublicSchema = userSchema.omit({
  passwordHash: true,
  emailVerified: true,
});

export const updateUserSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be at most 100 characters")
    .trim()
    .optional(),
  username: z
    .string()
    .min(3)
    .max(39)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
    .toLowerCase()
    .trim()
    .optional(),
  email: z.string().email().toLowerCase().trim().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const adminCreateUserSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(39, "Username must be at most 39 characters")
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      "Username must be lowercase alphanumeric with optional hyphens"
    )
    .toLowerCase()
    .trim(),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be at most 100 characters")
    .trim(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: userRoleSchema.default("user"),
});

export const adminUpdateRoleSchema = z.object({
  role: userRoleSchema,
});
