import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';

// Root NestJS module. Phase-0 keeps the controller list empty — domain
// modules get added one at a time via the strangler-fig migration
// (see pileo-rewrite.md). DatabaseModule is @Global so feature modules
// can inject SQLITE without re-importing it.
@Module({
  imports: [DatabaseModule],
})
export class AppModule {}
