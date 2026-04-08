import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { notifications } from '../db/schema/index.js';
import { NotFoundError } from '../utils/errors.js';

type NotificationRow = typeof notifications.$inferSelect;
type NotificationType = NotificationRow['type'];
type NotificationResourceType = NotificationRow['resourceType'];

export async function create(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  resourceType: NotificationResourceType,
  resourceId: string,
): Promise<NotificationRow> {
  const rows = await db
    .insert(notifications)
    .values({ userId, type, title, message, resourceType, resourceId })
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error('Failed to create notification');
  }
  return row;
}

export async function list(userId: string): Promise<NotificationRow[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function markRead(
  notificationId: string,
  userId: string,
): Promise<NotificationRow> {
  const rows = await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.id, notificationId), eq(notifications.userId, userId)),
    )
    .returning();

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('Notification', notificationId);
  }
  return row;
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return result[0]?.count ?? 0;
}
