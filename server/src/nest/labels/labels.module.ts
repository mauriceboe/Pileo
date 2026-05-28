import { Module } from '@nestjs/common';
import { LabelsController, ProjectLabelsController } from './labels.controller.js';
import { AuthModule } from '../auth/auth.module.js';

// First domain module migrated under the strangler-fig pattern. The HTTP
// surface (paths, bodies, status codes, error envelopes) is identical to
// the legacy routes in server/src/routes/label.routes.ts — only the
// transport layer has moved to NestJS. The service layer is shared, so
// label.service.ts continues to be the single source of truth.
@Module({
  imports: [AuthModule],
  controllers: [ProjectLabelsController, LabelsController],
})
export class LabelsModule {}
