import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  attachments,
  tasks,
  columns,
  boards,
} from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { getMemberRole, requireRole } from './project.service.js';
import * as activityService from './activity.service.js';
import * as fileService from './file.service.js';

type AttachmentRow = typeof attachments.$inferSelect;

interface TaskContext {
  taskId: string;
  columnId: string;
  boardId: string;
  projectId: string;
}

async function resolveTaskContext(taskId: string): Promise<TaskContext> {
  const rows = await db
    .select({
      taskId: tasks.id,
      columnId: tasks.columnId,
      boardId: columns.boardId,
      projectId: boards.projectId,
    })
    .from(tasks)
    .innerJoin(columns, eq(tasks.columnId, columns.id))
    .innerJoin(boards, eq(columns.boardId, boards.id))
    .where(eq(tasks.id, taskId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('Task', taskId);
  }

  return row;
}

export async function upload(
  taskId: string,
  userId: string,
  file: Express.Multer.File,
): Promise<AttachmentRow> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  const { fileName, filePath } = fileService.saveFile(file);

  const inserted = await db
    .insert(attachments)
    .values({
      taskId,
      uploaderId: userId,
      fileName,
      filePath,
      fileSize: file.size,
      mimeType: file.mimetype,
    })
    .returning();

  const attachment = inserted[0]!;

  await activityService.log(context.projectId, taskId, userId, 'attachment.uploaded', {
    attachmentId: attachment.id,
    fileName,
  });

  logger.info({ attachmentId: attachment.id, taskId, userId }, 'Attachment uploaded');
  return attachment;
}

export async function list(
  taskId: string,
  userId: string,
): Promise<AttachmentRow[]> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  if (!role) {
    throw new NotFoundError('Task', taskId);
  }

  return db
    .select()
    .from(attachments)
    .where(eq(attachments.taskId, taskId))
    .orderBy(attachments.createdAt);
}

export async function remove(
  attachmentId: string,
  userId: string,
): Promise<void> {
  const attachmentRows = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .limit(1);

  const attachment = attachmentRows[0];
  if (!attachment) {
    throw new NotFoundError('Attachment', attachmentId);
  }

  const context = await resolveTaskContext(attachment.taskId);
  const role = await getMemberRole(context.projectId, userId);

  const isUploader = attachment.uploaderId === userId;
  const isAdminOrOwner = role === 'owner' || role === 'admin';

  if (!isUploader && !isAdminOrOwner) {
    throw new ForbiddenError('You can only delete your own attachments');
  }

  // Delete file from filesystem
  await fileService.deleteFile(attachment.filePath);

  // Delete record
  await db.delete(attachments).where(eq(attachments.id, attachmentId));

  await activityService.log(context.projectId, attachment.taskId, userId, 'attachment.deleted', {
    attachmentId,
    fileName: attachment.fileName,
  });

  logger.info({ attachmentId, userId }, 'Attachment deleted');
}

export async function download(
  attachmentId: string,
  userId: string,
): Promise<{ filePath: string; fileName: string; mimeType: string }> {
  const attachmentRows = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .limit(1);

  const attachment = attachmentRows[0];
  if (!attachment) {
    throw new NotFoundError('Attachment', attachmentId);
  }

  const context = await resolveTaskContext(attachment.taskId);
  const role = await getMemberRole(context.projectId, userId);
  if (!role) {
    throw new NotFoundError('Attachment', attachmentId);
  }

  return {
    filePath: fileService.getFilePath(attachment.filePath),
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
  };
}
