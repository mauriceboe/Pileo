import { Controller, Get, HttpStatus, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { shareTokenRateLimit } from '../../middleware/rate-limit.middleware.js';
import * as shareService from '../../services/share.service.js';

// Per-token viewer registries shared across requests in this process.
// The Subject-style approach in Nest's @Sse pattern doesn't fit here —
// viewers are tracked by token (one Set per token), and the count is
// fan-out broadcast on every connect/disconnect.
const viewersByToken = new Map<string, Set<Response>>();

function broadcastViewerCount(token: string): void {
  const viewers = viewersByToken.get(token);
  if (!viewers) return;
  const data = `data: ${JSON.stringify({ count: viewers.size })}\n\n`;
  for (const res of viewers) res.write(data);
}

@Controller('api/v1/shared')
export class SharePublicController {
  // SSE viewer-tracking endpoint. We talk to Express directly because the
  // long-lived stream needs raw res.write() — Nest's Observable-based
  // @Sse abstracts a one-emitter-many-events model, not the broadcast
  // pattern we need here.
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

  // Public board read. Rate-limited with the same per-IP limiter as the
  // legacy route — we delegate to the express-rate-limit middleware and
  // run the service inside its next() callback so the limiter owns the
  // 429 response shape.
  @Get(':token')
  async getBoard(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await new Promise<void>((resolve) => {
      shareTokenRateLimit(req, res, async () => {
        const data = await shareService.getSharedBoardData(token);
        if (!data) {
          res.status(HttpStatus.NOT_FOUND).json({
            error: { code: 'NOT_FOUND', message: 'Invalid or expired link' },
          });
        } else {
          res.status(HttpStatus.OK).json({ data });
        }
        resolve();
      });
    });
  }
}
