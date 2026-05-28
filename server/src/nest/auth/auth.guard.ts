import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { UserPublic } from '@pileo/shared';
import * as apiKeyService from '../../services/api-key.service.js';
import * as userService from '../../services/user.service.js';
import { UnauthorizedError } from '../../utils/errors.js';

// Bearer API key takes precedence, then express-session.
@Injectable()
export class PileoAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: UserPublic }>();

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const rawKey = authHeader.slice(7);
      const result = await apiKeyService.resolve(rawKey);
      if (!result) throw new UnauthorizedError();
      req.user = await userService.getById(result.userId);
      return true;
    }

    const session = req.session as unknown as Record<string, unknown> | undefined;
    if (!session || !session['userId'] || !session['user']) {
      throw new UnauthorizedError();
    }
    req.user = session['user'] as UserPublic;
    return true;
  }
}
