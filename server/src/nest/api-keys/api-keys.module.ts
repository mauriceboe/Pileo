import { Module } from '@nestjs/common';
import { ApiKeysController, ProjectApiKeysController } from './api-keys.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ProjectApiKeysController, ApiKeysController],
})
export class ApiKeysModule {}
