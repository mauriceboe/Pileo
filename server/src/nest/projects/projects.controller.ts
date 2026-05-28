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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createProjectSchema, updateProjectSchema } from '@pileo/shared';
import type { CreateProjectInput, UpdateProjectInput } from '@pileo/shared';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../validation/zod.pipe.js';
import { ValidationError } from '../../utils/errors.js';
import { uploadOptions } from '../upload/upload.config.js';
import * as projectService from '../../services/project.service.js';

@Controller('api/v1/projects')
@UseGuards(PileoAuthGuard)
export class ProjectsController {
  @Get()
  async list(@CurrentUser() user: { id: string }): Promise<{ data: unknown }> {
    return { data: await projectService.list(user.id) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await projectService.create(body, user.id) };
  }

  @Get(':projectId')
  async get(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await projectService.getById(projectId, user.id) };
  }

  @Patch(':projectId')
  async update(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: UpdateProjectInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await projectService.update(projectId, user.id, body) };
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await projectService.remove(projectId, user.id);
  }

  @Patch(':projectId/archive')
  async archive(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await projectService.archive(projectId, user.id) };
  }

  @Patch(':projectId/background')
  @UseInterceptors(FileInterceptor('background', uploadOptions))
  async updateBackground(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    if (!file) throw new ValidationError('No file provided');
    const urlPath = `/uploads/${file.filename}`;
    return { data: await projectService.updateBackground(projectId, user.id, urlPath) };
  }
}
