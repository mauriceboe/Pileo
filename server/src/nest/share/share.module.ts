import { Module } from '@nestjs/common';
import { BoardShareLinkController } from './share.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [BoardShareLinkController],
})
export class ShareModule {}
