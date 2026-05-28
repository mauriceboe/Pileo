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
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  bulkTaskOperationSchema,
  updateTaskAssigneesSchema,
  updateTaskLabelsSchema,
} from '@pileo/shared';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
  BulkTaskOperationInput,
  UpdateTaskAssigneesInput,
  UpdateTaskLabelsInput,
} from '@pileo/shared';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../validation/zod.pipe.js';
import * as taskService from '../../services/task.service.js';

@Controller('api/v1/boards/:boardId/tasks')
@UseGuards(PileoAuthGuard)
export class BoardTasksController {
  @Get()
  async list(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await taskService.list(boardId, user.id) };
  }
}

@Controller('api/v1/columns/:columnId/tasks')
@UseGuards(PileoAuthGuard)
export class ColumnTasksController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('columnId') columnId: string,
    @Body(new ZodValidationPipe(createTaskSchema)) body: CreateTaskInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await taskService.create(columnId, user.id, body) };
  }
}

@Controller('api/v1/tasks')
@UseGuards(PileoAuthGuard)
export class TasksController {
  // ORDER MATTERS for Nest's path matcher: static sub-paths
  // (/bulk-move, /bulk-duplicate) MUST be declared before any :taskId
  // route, otherwise "bulk-move" gets matched as a taskId and the bulk
  // endpoints become unreachable.

  @Post('bulk-move')
  async bulkMove(
    @Body(new ZodValidationPipe(bulkTaskOperationSchema)) body: BulkTaskOperationInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await taskService.bulkMove(body.taskIds, body.targetColumnId, user.id) };
  }

  @Post('bulk-duplicate')
  async bulkDuplicate(
    @Body(new ZodValidationPipe(bulkTaskOperationSchema)) body: BulkTaskOperationInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await taskService.bulkDuplicate(body.taskIds, body.targetColumnId, user.id) };
  }

  @Get(':taskId/context')
  async getContext(
    @Param('taskId') taskId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await taskService.getContext(taskId, user.id) };
  }

  @Get(':taskId')
  async getById(
    @Param('taskId') taskId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await taskService.getById(taskId, user.id) };
  }

  @Patch(':taskId')
  async update(
    @Param('taskId') taskId: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) body: UpdateTaskInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await taskService.update(taskId, user.id, body) };
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('taskId') taskId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await taskService.remove(taskId, user.id);
  }

  @Patch(':taskId/move')
  async move(
    @Param('taskId') taskId: string,
    @Body(new ZodValidationPipe(moveTaskSchema)) body: MoveTaskInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await taskService.move(taskId, user.id, body) };
  }

  @Patch(':taskId/assignees')
  async updateAssignees(
    @Param('taskId') taskId: string,
    @Body(new ZodValidationPipe(updateTaskAssigneesSchema)) body: UpdateTaskAssigneesInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await taskService.updateAssignees(taskId, user.id, body) };
  }

  @Patch(':taskId/labels')
  async updateLabels(
    @Param('taskId') taskId: string,
    @Body(new ZodValidationPipe(updateTaskLabelsSchema)) body: UpdateTaskLabelsInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await taskService.updateLabels(taskId, user.id, body) };
  }
}
