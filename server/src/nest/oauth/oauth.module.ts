import { Module } from '@nestjs/common';
import { OauthController } from './oauth.controller.js';
import { WellKnownController } from './well-known.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [OauthController, WellKnownController],
})
export class OauthModule {}
