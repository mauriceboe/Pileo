import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createColumnSchema, updateColumnSchema } from '@pileo/shared';
import type { CreateColumnInput, UpdateColumnInput } from '@pileo/shared';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../validation/zod.pipe.js';
import * as columnService from '../../services/column.service.js';

@Controller('api/v1/boards/:boardId/columns')
@UseGuards(PileoAuthGuard)
export class BoardColumnsController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('boardId') boardId: string,
    @Body(new ZodValidationPipe(createColumnSchema)) body: CreateColumnInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await columnService.create(boardId, user.id, body) };
  }
}

@Controller('api/v1/columns')
@UseGuards(PileoAuthGuard)
export class ColumnsController {
  @Patch(':columnId')
  async update(
    @Param('columnId') columnId: string,
    @Body(new ZodValidationPipe(updateColumnSchema)) body: UpdateColumnInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await columnService.update(columnId, user.id, body) };
  }

  @Delete(':columnId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('columnId') columnId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await columnService.remove(columnId, user.id);
  }
}
