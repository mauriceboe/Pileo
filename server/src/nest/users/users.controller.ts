import {
  Body,
  Controller,
  Get,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { eq, and, isNotNull, isNull, sql } from 'drizzle-orm';
import { updateUserSchema, changePasswordSchema } from '@pileo/shared';
import type { UpdateUserInput, ChangePasswordInput } from '@pileo/shared';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../validation/zod.pipe.js';
import { ValidationError } from '../../utils/errors.js';
import { uploadOptions } from '../upload/upload.config.js';
import * as userService from '../../services/user.service.js';
import { db } from '../../config/database.js';
import { tasks, taskAssignees, columns, boards, notifications } from '../../db/schema/index.js';

@Controller('api/v1/users')
@UseGuards(PileoAuthGuard)
export class UsersController {
  @Get('me')
  async me(@CurrentUser() user: { id: string }): Promise<{ data: unknown }> {
    return { data: await userService.getById(user.id) };
  }

  @Patch('me')
  async updateMe(
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await userService.updateProfile(user.id, body) };
  }

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', uploadOptions))
  async updateAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    if (!file) throw new ValidationError('No file provided');
    return { data: await userService.updateAvatar(user.id, `/uploads/${file.filename}`) };
  }

  @Patch('me/password')
  async changePassword(
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: { message: string } }> {
    await userService.changePassword(user.id, body);
    return { data: { message: 'Password changed successfully' } };
  }

  // /me/tasks and /me/stats hit drizzle directly in the legacy route — no
  // service exists yet. We preserve the same query exactly rather than
  // refactoring it into a service in this PR; the service-extraction is
  // a separate, isolated cleanup that doesn't change the wire output.
  @Get('me/tasks')
  async myTasks(@CurrentUser() user: { id: string }): Promise<{ data: unknown }> {
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
      .where(eq(taskAssignees.userId, user.id))
      .orderBy(tasks.createdAt);
    return { data: rows };
  }

  @Get('me/stats')
  async myStats(@CurrentUser() user: { id: string }): Promise<{ data: { totalTasks: number; completed: number; inProgress: number; notifications: number } }> {
    const userId = user.id;
    const [totalRows, completedRows, inProgressRows, notifRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(taskAssignees)
        .where(eq(taskAssignees.userId, userId)),
      db.select({ count: sql<number>`count(*)` })
        .from(taskAssignees)
        .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
        .where(and(eq(taskAssignees.userId, userId), isNotNull(tasks.completedAt))),
      db.select({ count: sql<number>`count(*)` })
        .from(taskAssignees)
        .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
        .where(and(eq(taskAssignees.userId, userId), isNull(tasks.completedAt))),
      db.select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))),
    ]);
    return {
      data: {
        totalTasks: totalRows[0]?.count ?? 0,
        completed: completedRows[0]?.count ?? 0,
        inProgress: inProgressRows[0]?.count ?? 0,
        notifications: notifRows[0]?.count ?? 0,
      },
    };
  }
}
