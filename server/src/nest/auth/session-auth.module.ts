import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthModule } from './auth.module.js';

// Wraps the existing AuthModule (which provides the guard) and adds the
// /api/v1/auth controller. Kept separate from AuthModule so feature
// modules can import the guard without dragging in the auth routes.
@Module({
  imports: [AuthModule],
  controllers: [AuthController],
})
export class SessionAuthModule {}
