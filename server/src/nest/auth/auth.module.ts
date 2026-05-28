import { Module } from '@nestjs/common';
import { PileoAuthGuard } from './auth.guard.js';

// Re-usable auth providers. Feature modules import this and apply
// PileoAuthGuard via @UseGuards on their controllers.
@Module({
  providers: [PileoAuthGuard],
  exports: [PileoAuthGuard],
})
export class AuthModule {}
