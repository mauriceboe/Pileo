import { Module } from '@nestjs/common';
import { BoardColumnsController, ColumnsController } from './columns.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [BoardColumnsController, ColumnsController],
})
export class ColumnsModule {}
