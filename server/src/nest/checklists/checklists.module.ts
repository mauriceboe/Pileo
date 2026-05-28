import { Module } from '@nestjs/common';
import { ChecklistController, TaskChecklistController } from './checklists.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [TaskChecklistController, ChecklistController],
})
export class ChecklistsModule {}
