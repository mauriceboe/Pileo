import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@pileo/shared';
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '@pileo/shared';
import { PileoAuthGuard } from './auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import { ZodValidationPipe } from '../validation/zod.pipe.js';
import { AppError } from '../../utils/errors.js';
import * as authService from '../../services/auth.service.js';
import { isRegistrationEnabled } from '../../services/settings.service.js';

// Public auth endpoints. We pass @Req() into the service for register +
// login because the service writes the session on the Express request
// object — that behaviour stays exactly the same on the Nest side because
// the Nest Express instance also has the session middleware mounted
// (see bootstrap.ts).
@Controller('api/v1/auth')
export class AuthController {
  @Get('registration-status')
  registrationStatus(): { data: { enabled: boolean } } {
    return { data: { enabled: isRegistrationEnabled() } };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Req() req: Request,
  ): Promise<{ data: unknown }> {
    if (!isRegistrationEnabled()) {
      // Same envelope, status, code, and message as the legacy route.
      throw new AppError('Registration is currently disabled', 403, 'REGISTRATION_DISABLED');
    }
    const user = await authService.register(body, req);
    return { data: user };
  }

  // Nest defaults POST to 201 CREATED; legacy login returns 200, so we
  // pin the status explicitly here (and on forgot/reset-password below).
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
  ): Promise<{ data: unknown }> {
    return { data: await authService.login(body, req) };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    await authService.logout(req);
    res.clearCookie('pileo.sid');
    res.status(200).json({ data: { message: 'Logged out successfully' } });
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput,
  ): Promise<{ data: { message: string } }> {
    await authService.forgotPassword(body.email);
    return { data: { message: 'If an account with that email exists, a reset link has been sent' } };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
  ): Promise<{ data: { message: string } }> {
    await authService.resetPassword(body.token, body.password);
    return { data: { message: 'Password has been reset successfully' } };
  }

  @Get('me')
  @UseGuards(PileoAuthGuard)
  async me(@CurrentUser() user: { id: string }): Promise<{ data: unknown }> {
    return { data: await authService.getCurrentUser(user.id) };
  }
}
