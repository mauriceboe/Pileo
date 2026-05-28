import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import * as notificationService from '../../services/notification.service.js';

@Controller('api/v1/notifications')
@UseGuards(PileoAuthGuard)
export class NotificationsController {
  // GET returns BOTH the list and a top-level unreadCount field — the
  // legacy response is {data, unreadCount}, not the more common {data}.
  // We must keep that exact shape.
  @Get()
  async list(@CurrentUser() user: { id: string }): Promise<{ data: unknown; unreadCount: number }> {
    const [data, unreadCount] = await Promise.all([
      notificationService.list(user.id),
      notificationService.getUnreadCount(user.id),
    ]);
    return { data, unreadCount };
  }

  @Patch(':id/read')
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await notificationService.markRead(id, user.id) };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(@CurrentUser() user: { id: string }): Promise<void> {
    await notificationService.markAllRead(user.id);
  }
}
