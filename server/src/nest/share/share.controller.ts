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

// Only the board-side share-link CRUD migrates. The public /shared/:token
// read endpoint and the SSE viewer-tracking endpoint stay on legacy
// Express until the SSE plumbing is refactored to use Nest's @Sse pattern
// (out of scope for this PR).
@Controller('api/v1/boards/:boardId/share-link')
@UseGuards(PileoAuthGuard)
export class BoardShareLinkController {
  // Legacy POST returns 201 if the link was newly created, 200 if it
  // already existed. Reproduce that exactly so the client doesn't have
  // to differentiate.
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
