import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { RequireAdminGuard } from './require-admin.guard.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  providers: [RequireAdminGuard],
  controllers: [AdminController],
})
export class AdminModule {}
