import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import * as activityService from '../../services/activity.service.js';

@Controller('api/v1/projects/:projectId/activity')
@UseGuards(PileoAuthGuard)
export class ProjectActivityController {
  @Get()
  async list(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await activityService.getForProject(projectId, user.id) };
  }
}

@Controller('api/v1/tasks/:taskId/activity')
@UseGuards(PileoAuthGuard)
export class TaskActivityController {
  @Get()
  async list(
    @Param('taskId') taskId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await activityService.getForTask(taskId, user.id) };
  }
}
