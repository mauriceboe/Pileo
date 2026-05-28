import { Module } from '@nestjs/common';
import { LinksController, TaskLinksController } from './links.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [TaskLinksController, LinksController],
})
export class LinksModule {}
