import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { OauthController } from './oauth.controller.js';

// The OAuth discovery URIs are mandated to live at the origin's
// /.well-known path (RFC 8414 + RFC 9728), but the JSON payload is the
// same one the OauthController serves. We delegate rather than duplicate.
@Controller('.well-known')
export class WellKnownController {
  private readonly oauth = new OauthController();

  @Get('oauth-authorization-server')
  authorizationServer(@Req() req: Request): Record<string, unknown> {
    return this.oauth.authorizationServerDiscovery(req);
  }

  @Get('oauth-protected-resource/api/v1/mcp')
  protectedResource(@Req() req: Request): Record<string, unknown> {
    return this.oauth.protectedResourceDiscovery(req);
  }
}
