import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { Express } from 'express';
import express from 'express';
import session from 'express-session';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { Module, Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { AppErrorFilter } from '../error/app-error.filter.js';
import { AuthModule } from '../auth/auth.module.js';

// Minimal Nest app used to prove that a server-set session cookie
// resolves correctly through PileoAuthGuard on the next request.
// Mocks the api-key + user services so the test does not need a DB.

vi.mock('../../services/api-key.service.js', () => ({
  resolve: vi.fn(),
}));
vi.mock('../../services/user.service.js', () => ({
  getById: vi.fn(),
}));

@Controller('test')
class TestController {
  @Get('public/login')
  login(@Req() req: Request): { ok: boolean } {
    const sess = req.session as unknown as Record<string, unknown>;
    sess['userId'] = 'user-1';
    sess['user'] = { id: 'user-1', username: 'maurice' };
    return { ok: true };
  }

  @Get('private/me')
  @UseGuards(PileoAuthGuard)
  me(@CurrentUser() user: { id: string; username: string }): { user: typeof user } {
    return { user };
  }
}

@Module({
  imports: [AuthModule],
  controllers: [TestController],
})
class TestModule {}

describe('session-cookie integration flow', () => {
  let app: NestExpressApplication;
  let server: Express;

  beforeAll(async () => {
    server = express();
    server.use(
      session({
        secret: 'integration-test-secret-32-chars-or-more',
        resave: false,
        saveUninitialized: false,
        name: 'pileo.sid',
      }),
    );
    app = await NestFactory.create<NestExpressApplication>(
      TestModule,
      new ExpressAdapter(server),
      { logger: false },
    );
    app.useGlobalFilters(new AppErrorFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects /private/me without a session', async () => {
    const res = await request(server).get('/test/private/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  });

  // The login endpoint manually writes session state on the request.
  // The cookie roundtrip is the actual integration point being tested.
  it('accepts /private/me once a session cookie has been set', async () => {
    const agent = request.agent(server);
    const loginRes = await agent.get('/test/public/login');
    expect(loginRes.status).toBe(200);
    expect(loginRes.headers['set-cookie']).toBeDefined();

    const meRes = await agent.get('/test/private/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.id).toBe('user-1');
    expect(meRes.body.user.username).toBe('maurice');
  });
});
