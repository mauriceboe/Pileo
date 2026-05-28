import { Module } from '@nestjs/common';
import { BoardsController, ProjectBoardsController } from './boards.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ProjectBoardsController, BoardsController],
})
export class BoardsModule {}
