import { Module } from '@nestjs/common';

// Root NestJS module. Phase-0 keeps this empty — modules get added one
// per domain via the strangler-fig migration (see pileo-rewrite.md).
@Module({})
export class AppModule {}
