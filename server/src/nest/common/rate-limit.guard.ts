import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from '../../utils/errors.js';
import { RateLimiter, type RateLimiterOptions } from '../mcp/rate-limit.js';

// Lightweight per-IP rate-limit guard. We re-use the in-memory RateLimiter
// the MCP controller already uses so the codebase doesn't carry two
// limiter implementations (express-rate-limit was the third — now gone).
export function rateLimitGuard(opts: RateLimiterOptions): new () => CanActivate {
  // Limiter state is per-guard-instance: one Map per guard, shared
  // across requests, isolated from any other rateLimitGuard call.
  const limiter = new RateLimiter(opts);

  @Injectable()
  class Guard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
      const req = ctx.switchToHttp().getRequest<Request>();
      const key = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
        ?? req.ip
        ?? 'unknown';
      if (limiter.isLimited(key)) {
        throw new AppError('Too many requests, please try again later', 429, 'RATE_LIMITED');
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
