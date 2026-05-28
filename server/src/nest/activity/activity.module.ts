import { Module } from '@nestjs/common';
import { ProjectActivityController, TaskActivityController } from './activity.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ProjectActivityController, TaskActivityController],
})
export class ActivityModule {}
