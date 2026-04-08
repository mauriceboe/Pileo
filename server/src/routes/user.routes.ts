import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { updateUserSchema, changePasswordSchema } from '@pileo/shared';
import type { UpdateUserInput, ChangePasswordInput } from '@pileo/shared';
import * as userService from '../services/user.service.js';
import { db } from '../config/database.js';
import { tasks, taskAssignees, notifications } from '../db/schema/index.js';
import { eq, and, isNotNull, isNull, sql } from 'drizzle-orm';

const router = Router();

router.use(authenticate);

router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const user = await userService.getById((req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: user });
});

router.patch('/me', validate(updateUserSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: UpdateUserInput }).validatedBody;
  const user = await userService.updateProfile((req as AuthenticatedRequest).user.id, body);
  res.status(200).json({ data: user });
});

router.patch('/me/avatar', upload.single('avatar'), async (req: Request, res: Response): Promise<void> => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No file provided' } });
    return;
  }
  // Store only the filename, serve via /uploads/<filename>
  const avatarUrl = `/uploads/${file.filename}`;
  const user = await userService.updateAvatar((req as AuthenticatedRequest).user.id, avatarUrl);
  res.status(200).json({ data: user });
});

router.patch('/me/password', validate(changePasswordSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: ChangePasswordInput }).validatedBody;
  await userService.changePassword((req as AuthenticatedRequest).user.id, body);
  res.status(200).json({ data: { message: 'Password changed successfully' } });
});

// GET /users/me/tasks — tasks assigned to this user with project/board info
router.get('/me/tasks', async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).user.id;
  const { columns } = await import('../db/schema/index.js');
  const { boards } = await import('../db/schema/index.js');

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      columnId: tasks.columnId,
      columnName: columns.name,
      columnColor: columns.color,
      boardId: boards.id,
      boardName: boards.name,
      projectId: boards.projectId,
      createdAt: tasks.createdAt,
    })
    .from(taskAssignees)
    .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
    .innerJoin(columns, eq(tasks.columnId, columns.id))
    .innerJoin(boards, eq(columns.boardId, boards.id))
    .where(eq(taskAssignees.userId, userId))
    .orderBy(tasks.createdAt);

  res.status(200).json({ data: rows });
});

// GET /users/me/stats — real dashboard counts
router.get('/me/stats', async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).user.id;

  const [totalTasksRows, completedRows, inProgressRows, notifRows] = await Promise.all([
    // Total tasks assigned to user
    db.select({ count: sql<number>`count(*)` })
      .from(taskAssignees)
      .where(eq(taskAssignees.userId, userId)),
    // Completed tasks (assigned to user, completedAt not null)
    db.select({ count: sql<number>`count(*)` })
      .from(taskAssignees)
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .where(and(eq(taskAssignees.userId, userId), isNotNull(tasks.completedAt))),
    // In progress tasks (assigned to user, completedAt is null)
    db.select({ count: sql<number>`count(*)` })
      .from(taskAssignees)
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .where(and(eq(taskAssignees.userId, userId), isNull(tasks.completedAt))),
    // Unread notifications
    db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))),
  ]);

  res.status(200).json({
    data: {
      totalTasks: totalTasksRows[0]?.count ?? 0,
      completed: completedRows[0]?.count ?? 0,
      inProgress: inProgressRows[0]?.count ?? 0,
      notifications: notifRows[0]?.count ?? 0,
    },
  });
});

export { router as userRoutes };
