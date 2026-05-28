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
import { createLabelSchema, updateLabelSchema } from '@pileo/shared';
import type { CreateLabelInput, UpdateLabelInput } from '@pileo/shared';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../validation/zod.pipe.js';
import * as labelService from '../../services/label.service.js';

// Project-scoped collection endpoints (list + create).
@Controller('api/v1/projects/:projectId/labels')
@UseGuards(PileoAuthGuard)
export class ProjectLabelsController {
  @Get()
  async list(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    const rows = await labelService.list(projectId, user.id);
    return { data: rows };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createLabelSchema)) body: CreateLabelInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    const label = await labelService.create(projectId, user.id, body);
    return { data: label };
  }
}

// Single-resource endpoints (patch + delete).
@Controller('api/v1/labels')
@UseGuards(PileoAuthGuard)
export class LabelsController {
  @Patch(':labelId')
  async update(
    @Param('labelId') labelId: string,
    @Body(new ZodValidationPipe(updateLabelSchema)) body: UpdateLabelInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    const label = await labelService.update(labelId, user.id, body);
    return { data: label };
  }

  @Delete(':labelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('labelId') labelId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await labelService.remove(labelId, user.id);
  }
}
