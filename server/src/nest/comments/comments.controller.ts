import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createCommentSchema, updateCommentSchema } from '@pileo/shared';
import type { CreateCommentInput, UpdateCommentInput } from '@pileo/shared';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../validation/zod.pipe.js';
import * as commentService from '../../services/comment.service.js';

@Controller('api/v1/tasks/:taskId/comments')
@UseGuards(PileoAuthGuard)
export class TaskCommentsController {
  @Get()
  async list(
    @Param('taskId') taskId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await commentService.list(taskId, user.id) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('taskId') taskId: string,
    @Body(new ZodValidationPipe(createCommentSchema)) body: CreateCommentInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await commentService.create(taskId, user.id, body.content) };
  }
}

@Controller('api/v1/comments')
@UseGuards(PileoAuthGuard)
export class CommentsController {
  @Patch(':commentId')
  async update(
    @Param('commentId') commentId: string,
    @Body(new ZodValidationPipe(updateCommentSchema)) body: UpdateCommentInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await commentService.update(commentId, user.id, body.content) };
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await commentService.remove(commentId, user.id);
  }
}
