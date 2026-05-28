import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ValidationError } from '../../utils/errors.js';
import * as apiKeyService from '../../services/api-key.service.js';

interface CreateKeyBody { name?: unknown }

@Controller('api/v1/projects/:projectId/api-keys')
@UseGuards(PileoAuthGuard)
export class ProjectApiKeysController {
  @Get()
  async list(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await apiKeyService.list(projectId, user.id) };
  }

  // Legacy emits the exact message "Name is required (max 100 characters)"
  // when the name is missing or too long — reproduce verbatim.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('projectId') projectId: string,
    @Body() body: CreateKeyBody,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    const name = typeof body.name === 'string' ? body.name : '';
    if (!name || name.trim().length === 0 || name.length > 100) {
      throw new ValidationError('Name is required (max 100 characters)');
    }
    return { data: await apiKeyService.create(projectId, user.id, name.trim()) };
  }
}

@Controller('api/v1/api-keys')
@UseGuards(PileoAuthGuard)
export class ApiKeysController {
  @Delete(':keyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Param('keyId') keyId: string, @CurrentUser() user: { id: string }): Promise<void> {
    await apiKeyService.revoke(keyId, user.id);
  }
}
