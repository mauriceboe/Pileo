import { Module } from '@nestjs/common';
import { AttachmentsController, TaskAttachmentsController } from './attachments.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [TaskAttachmentsController, AttachmentsController],
})
export class AttachmentsModule {}
