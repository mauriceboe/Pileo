import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UserPublic } from '@pileo/shared';

// Pull req.user (set by PileoAuthGuard) into controller method arguments
// without each controller having to reach into the raw request.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPublic => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: UserPublic }>();
    if (!req.user) {
      // Should be unreachable when PileoAuthGuard is applied first.
      throw new Error('CurrentUser used without PileoAuthGuard — no user on request');
    }
    return req.user;
  },
);
