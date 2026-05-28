import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import * as shareService from '../../services/share.service.js';

@Controller('api/v1/boards/:boardId/share-link')
@UseGuards(PileoAuthGuard)
export class BoardShareLinkController {
  // 201 if newly created, 200 if the link already existed.
  @Post()
  async create(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { id: string },
    @Res() res: Response,
  ): Promise<void> {
    const result = await shareService.createShareLink(boardId, user.id);
    res.status(result.created ? 201 : 200).json({ data: { token: result.token } });
  }

  @Get()
  async get(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await shareService.getShareLink(boardId, user.id) };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await shareService.deleteShareLink(boardId, user.id);
  }
}
