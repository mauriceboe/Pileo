import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ShareTokenRateLimitGuard } from '../common/rate-limit.guard.js';
import { AppError } from '../../utils/errors.js';
import * as shareService from '../../services/share.service.js';

// Per-token viewer registries shared across requests in this process.
// Tracks one Set<Response> per token; the count is fan-out broadcast on
// every connect/disconnect.
const viewersByToken = new Map<string, Set<Response>>();

function broadcastViewerCount(token: string): void {
  const viewers = viewersByToken.get(token);
  if (!viewers) return;
  const data = `data: ${JSON.stringify({ count: viewers.size })}\n\n`;
  for (const res of viewers) res.write(data);
}

@Controller('api/v1/shared')
export class SharePublicController {
  // Long-lived SSE stream — uses raw res.write() because Nest's @Sse
  // is one-emitter-many-events, not broadcast.
  @Get(':token/viewers')
  viewers(@Param('token') token: string, @Req() req: Request, @Res() res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    let viewers = viewersByToken.get(token);
    if (!viewers) {
      viewers = new Set();
      viewersByToken.set(token, viewers);
    }
    viewers.add(res);
    broadcastViewerCount(token);

    req.on('close', () => {
      viewers!.delete(res);
      if (viewers!.size === 0) viewersByToken.delete(token);
      else broadcastViewerCount(token);
    });
  }

  @Get(':token')
  @UseGuards(ShareTokenRateLimitGuard)
  async getBoard(@Param('token') token: string): Promise<{ data: unknown }> {
    const data = await shareService.getSharedBoardData(token);
    if (!data) throw new AppError('Invalid or expired link', 404, 'NOT_FOUND');
    return { data };
  }
}
