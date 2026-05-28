import { Module } from '@nestjs/common';
import { CommentsController, TaskCommentsController } from './comments.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [TaskCommentsController, CommentsController],
})
export class CommentsModule {}
