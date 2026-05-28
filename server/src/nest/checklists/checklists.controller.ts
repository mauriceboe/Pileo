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
import {
  createChecklistItemSchema,
  updateChecklistItemSchema,
  reorderChecklistSchema,
} from '@pileo/shared';
import type {
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
  ReorderChecklistInput,
} from '@pileo/shared';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../validation/zod.pipe.js';
import * as checklistService from '../../services/checklist.service.js';

@Controller('api/v1/tasks/:taskId/checklist')
@UseGuards(PileoAuthGuard)
export class TaskChecklistController {
  @Get()
  async list(
    @Param('taskId') taskId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await checklistService.list(taskId, user.id) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('taskId') taskId: string,
    @Body(new ZodValidationPipe(createChecklistItemSchema)) body: CreateChecklistItemInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await checklistService.create(taskId, user.id, body.title) };
  }

  // PATCH reorder is declared before any :itemId route by living on a
  // different controller — no collision risk here.
  @Patch('reorder')
  async reorder(
    @Param('taskId') taskId: string,
    @Body(new ZodValidationPipe(reorderChecklistSchema)) body: ReorderChecklistInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await checklistService.reorder(taskId, user.id, body.itemIds) };
  }
}

@Controller('api/v1/checklist')
@UseGuards(PileoAuthGuard)
export class ChecklistController {
  @Patch(':itemId')
  async update(
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateChecklistItemSchema)) body: UpdateChecklistItemInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await checklistService.update(itemId, user.id, body) };
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('itemId') itemId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await checklistService.remove(itemId, user.id);
  }
}
