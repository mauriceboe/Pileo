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
import { createBoardSchema, updateBoardSchema, reorderColumnsSchema } from '@pileo/shared';
import type { CreateBoardInput, UpdateBoardInput, ReorderColumnsInput } from '@pileo/shared';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../validation/zod.pipe.js';
import * as boardService from '../../services/board.service.js';

@Controller('api/v1/projects/:projectId/boards')
@UseGuards(PileoAuthGuard)
export class ProjectBoardsController {
  @Get()
  async list(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await boardService.list(projectId, user.id) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createBoardSchema)) body: CreateBoardInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await boardService.create(projectId, user.id, body) };
  }
}

@Controller('api/v1/boards')
@UseGuards(PileoAuthGuard)
export class BoardsController {
  @Get(':boardId')
  async get(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await boardService.getById(boardId, user.id) };
  }

  @Patch(':boardId')
  async update(
    @Param('boardId') boardId: string,
    @Body(new ZodValidationPipe(updateBoardSchema)) body: UpdateBoardInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await boardService.update(boardId, user.id, body) };
  }

  @Delete(':boardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await boardService.remove(boardId, user.id);
  }

  @Patch(':boardId/reorder')
  async reorderColumns(
    @Param('boardId') boardId: string,
    @Body(new ZodValidationPipe(reorderColumnsSchema)) body: ReorderColumnsInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: { message: string } }> {
    await boardService.reorderColumns(boardId, user.id, body.columnIds);
    return { data: { message: 'Columns reordered successfully' } };
  }
}
