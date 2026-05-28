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
import { updateUserSchema, changePasswordSchema } from '@pileo/shared';
import type { UpdateUserInput, ChangePasswordInput } from '@pileo/shared';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../validation/zod.pipe.js';
import { ValidationError } from '../../utils/errors.js';
import { uploadOptions } from '../upload/upload.config.js';
import * as userService from '../../services/user.service.js';
import * as userStats from '../../services/user-stats.service.js';

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

  @Get('me/tasks')
  async myTasks(@CurrentUser() user: { id: string }): Promise<{ data: unknown }> {
    return { data: await userStats.listAssignedTasks(user.id) };
  }

  @Get('me/stats')
  async myStats(
    @CurrentUser() user: { id: string },
  ): Promise<{ data: { totalTasks: number; completed: number; inProgress: number; notifications: number } }> {
    return { data: await userStats.getDashboardStats(user.id) };
  }
}
