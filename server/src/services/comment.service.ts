import { eq, desc, and } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  comments,
  tasks,
  columns,
  boards,
  users,
  projectMembers,
  notifications,
} from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { getMemberRole, requireRole } from './project.service.js';
import * as activityService from './activity.service.js';
import { broadcastToBoard } from '../websocket/broadcast.js';
import { WEBSOCKET_EVENTS } from '@pileo/shared';

type CommentRow = typeof comments.$inferSelect;

interface CommentWithAuthor extends CommentRow {
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarPath: string | null;
  };
}

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

function parseMentions(content: string): string[] {
  const mentionRegex = /@(\w[\w-]*)/g;
  const usernames: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1];
    if (username) {
      usernames.push(username.toLowerCase());
    }
  }

  return [...new Set(usernames)];
}

export async function create(
  taskId: string,
  userId: string,
  content: string,
): Promise<CommentWithAuthor> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  requireRole(role, ['owner', 'admin', 'member']);

  const inserted = await db
    .insert(comments)
    .values({
      taskId,
      authorId: userId,
      content,
    })
    .returning();

  const comment = inserted[0]!;

  // Get author info
  const authorRows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarPath: users.avatarPath,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const author = authorRows[0]!;

  // Parse @mentions and create notifications
  const mentionedUsernames = parseMentions(content);
  if (mentionedUsernames.length > 0) {
    // Find users by username who are project members
    const allMentionedUsers: Array<{ userId: string; username: string }> = [];

    for (const username of mentionedUsernames) {
      const found = await db
        .select({
          userId: users.id,
          username: users.username,
        })
        .from(users)
        .innerJoin(
          projectMembers,
          and(
            eq(projectMembers.userId, users.id),
            eq(projectMembers.projectId, context.projectId),
          ),
        )
        .where(eq(users.username, username));

      allMentionedUsers.push(...found);
    }

    // Get task title for notification message
    const taskRow = await db
      .select({ title: tasks.title })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    const taskTitle = taskRow[0]?.title ?? 'Unknown task';

    const notificationValues = allMentionedUsers
      .filter((mentionedUser) => mentionedUser.userId !== userId)
      .map((mentionedUser) => ({
        userId: mentionedUser.userId,
        type: 'mention' as const,
        title: 'You were mentioned in a comment',
        message: `${author.displayName} mentioned you in "${taskTitle}"`,
        resourceType: 'task' as const,
        resourceId: taskId,
      }));

    if (notificationValues.length > 0) {
      await db.insert(notifications).values(notificationValues);
    }
  }

  await activityService.log(context.projectId, taskId, userId, 'comment.created', {
    commentId: comment.id,
  });

  const result: CommentWithAuthor = { ...comment, author };

  broadcastToBoard(context.boardId, WEBSOCKET_EVENTS.COMMENT_CREATED, result, userId);

  logger.info({ commentId: comment.id, taskId, userId }, 'Comment created');
  return result;
}

export async function list(
  taskId: string,
  userId: string,
): Promise<CommentWithAuthor[]> {
  const context = await resolveTaskContext(taskId);
  const role = await getMemberRole(context.projectId, userId);
  if (!role) {
    throw new NotFoundError('Task', taskId);
  }

  const rows = await db
    .select({
      id: comments.id,
      taskId: comments.taskId,
      authorId: comments.authorId,
      content: comments.content,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorUsername: users.username,
      authorDisplayName: users.displayName,
      authorAvatarPath: users.avatarPath,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.taskId, taskId))
    .orderBy(desc(comments.createdAt));

  return rows.map((row) => ({
    id: row.id,
    taskId: row.taskId,
    authorId: row.authorId,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: {
      id: row.authorId,
      username: row.authorUsername,
      displayName: row.authorDisplayName,
      avatarPath: row.authorAvatarPath,
    },
  }));
}

export async function update(
  commentId: string,
  userId: string,
  content: string,
): Promise<CommentWithAuthor> {
  const commentRows = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  const comment = commentRows[0];
  if (!comment) {
    throw new NotFoundError('Comment', commentId);
  }

  if (comment.authorId !== userId) {
    throw new ForbiddenError('You can only edit your own comments');
  }

  const context = await resolveTaskContext(comment.taskId);

  const updated = await db
    .update(comments)
    .set({ content, updatedAt: new Date().toISOString() })
    .where(eq(comments.id, commentId))
    .returning();

  const updatedComment = updated[0]!;

  const authorRows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarPath: users.avatarPath,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const result: CommentWithAuthor = { ...updatedComment, author: authorRows[0]! };

  broadcastToBoard(context.boardId, WEBSOCKET_EVENTS.COMMENT_UPDATED, result, userId);

  logger.info({ commentId, userId }, 'Comment updated');
  return result;
}

export async function remove(
  commentId: string,
  userId: string,
): Promise<void> {
  const commentRows = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  const comment = commentRows[0];
  if (!comment) {
    throw new NotFoundError('Comment', commentId);
  }

  const context = await resolveTaskContext(comment.taskId);
  const role = await getMemberRole(context.projectId, userId);

  const isAuthor = comment.authorId === userId;
  const isAdminOrOwner = role === 'owner' || role === 'admin';

  if (!isAuthor && !isAdminOrOwner) {
    throw new ForbiddenError('You can only delete your own comments');
  }

  await db.delete(comments).where(eq(comments.id, commentId));

  broadcastToBoard(context.boardId, WEBSOCKET_EVENTS.COMMENT_DELETED, {
    commentId,
    taskId: comment.taskId,
  }, userId);

  logger.info({ commentId, userId }, 'Comment deleted');
}
