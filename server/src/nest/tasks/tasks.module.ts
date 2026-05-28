import { Module } from '@nestjs/common';
import { BoardTasksController, ColumnTasksController, TasksController } from './tasks.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [BoardTasksController, ColumnTasksController, TasksController],
})
export class TasksModule {}
