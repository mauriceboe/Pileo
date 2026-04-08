import { z } from "zod";
import { NOTIFICATION_TYPES, NOTIFICATION_RESOURCE_TYPES } from "../constants/index.js";

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
export const notificationResourceTypeSchema = z.enum(NOTIFICATION_RESOURCE_TYPES);

export const notificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  resourceType: notificationResourceTypeSchema,
  resourceId: z.string().uuid(),
  isRead: z.boolean().default(false),
  createdAt: z.string(),
});

export const markNotificationReadSchema = z.object({
  isRead: z.boolean().default(true),
});
