import { Module } from '@nestjs/common';
import { MembersController } from './members.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [MembersController],
})
export class MembersModule {}
