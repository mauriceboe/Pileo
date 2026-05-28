import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
