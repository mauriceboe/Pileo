import { Module } from '@nestjs/common';
import { LabelsController, ProjectLabelsController } from './labels.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ProjectLabelsController, LabelsController],
})
export class LabelsModule {}
