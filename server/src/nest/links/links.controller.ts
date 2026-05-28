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
import * as linkService from '../../services/link.service.js';

interface CreateLinkBody { url?: unknown }

@Controller('api/v1/tasks/:taskId/links')
@UseGuards(PileoAuthGuard)
export class TaskLinksController {
  @Get()
  async list(
    @Param('taskId') taskId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await linkService.list(taskId, user.id) };
  }

  // No URL validation — clients depend on the looser legacy behaviour.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('taskId') taskId: string,
    @Body() body: CreateLinkBody,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await linkService.create(taskId, user.id, body.url as string) };
  }
}

@Controller('api/v1/links')
@UseGuards(PileoAuthGuard)
export class LinksController {
  @Delete(':linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('linkId') linkId: string, @CurrentUser() user: { id: string }): Promise<void> {
    await linkService.remove(linkId, user.id);
  }
}
