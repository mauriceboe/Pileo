import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimiter, type RateLimiterOptions } from '../mcp/rate-limit.js';

// Lightweight per-IP rate-limit guard. We re-use the in-memory RateLimiter
// the MCP controller already uses so the codebase doesn't carry two
// limiter implementations (express-rate-limit was the third — now gone).
export function rateLimitGuard(opts: RateLimiterOptions) {
  @Injectable()
  class Guard implements CanActivate {
    private readonly limiter = new RateLimiter(opts);

    canActivate(ctx: ExecutionContext): boolean {
      const req = ctx.switchToHttp().getRequest<Request>();
      const key = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
        ?? req.ip
        ?? 'unknown';
      if (this.limiter.isLimited(key)) {
        throw new HttpException(
          { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return true;
    }
  }
  return Guard;
}

export const ShareTokenRateLimitGuard = rateLimitGuard({
  windowMs: 60 * 60 * 1000,
  max: 30,
});
