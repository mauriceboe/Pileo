import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { addProjectMemberByEmailSchema, updateProjectMemberSchema } from '@pileo/shared';
import type { AddProjectMemberByEmailInput, UpdateProjectMemberInput } from '@pileo/shared';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../validation/zod.pipe.js';
import * as memberService from '../../services/member.service.js';

@Controller('api/v1/projects/:projectId/members')
@UseGuards(PileoAuthGuard)
export class MembersController {
  @Get()
  async list(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await memberService.listMembers(projectId, user.id) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async add(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(addProjectMemberByEmailSchema)) body: AddProjectMemberByEmailInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await memberService.addMember(projectId, user.id, body.email, body.role) };
  }

  @Patch(':userId')
  async updateRole(
    @Param('projectId') projectId: string,
    @Param('userId') memberUserId: string,
    @Body(new ZodValidationPipe(updateProjectMemberSchema)) body: UpdateProjectMemberInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await memberService.updateMemberRole(projectId, user.id, memberUserId, body.role) };
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('projectId') projectId: string,
    @Param('userId') memberUserId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await memberService.removeMember(projectId, user.id, memberUserId);
  }
}
