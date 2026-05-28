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
import { adminCreateUserSchema, adminUpdateRoleSchema } from '@pileo/shared';
import type { AdminCreateUserInput, AdminUpdateRoleInput } from '@pileo/shared';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../validation/zod.pipe.js';
import { RequireAdminGuard } from './require-admin.guard.js';
import * as adminService from '../../services/admin.service.js';
import * as settingsService from '../../services/settings.service.js';

@Controller('api/v1/admin')
@UseGuards(PileoAuthGuard, RequireAdminGuard)
export class AdminController {
  @Get('users')
  async listUsers(): Promise<{ data: unknown }> {
    return { data: await adminService.listUsers() };
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body(new ZodValidationPipe(adminCreateUserSchema)) body: AdminCreateUserInput,
  ): Promise<{ data: unknown }> {
    return { data: await adminService.createUser(body) };
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await adminService.deleteUser(targetUserId, user.id);
  }

  @Patch('users/:userId/role')
  async updateRole(
    @Param('userId') targetUserId: string,
    @Body(new ZodValidationPipe(adminUpdateRoleSchema)) body: AdminUpdateRoleInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await adminService.updateRole(targetUserId, user.id, body) };
  }

  // Non-boolean registrationEnabled values are silently ignored.
  @Get('settings')
  getSettings(): { data: { registrationEnabled: boolean } } {
    return { data: { registrationEnabled: settingsService.isRegistrationEnabled() } };
  }

  @Patch('settings')
  updateSettings(@Body() body: { registrationEnabled?: unknown }): { data: { registrationEnabled: boolean } } {
    if (typeof body?.registrationEnabled === 'boolean') {
      settingsService.setSetting('registration_enabled', String(body.registrationEnabled));
    }
    return { data: { registrationEnabled: settingsService.isRegistrationEnabled() } };
  }
}
