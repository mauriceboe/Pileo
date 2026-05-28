import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { McpModule } from './mcp/mcp.module.js';

// Root NestJS module. Domain modules get added one at a time via the
// strangler-fig migration (see pileo-rewrite.md). DatabaseModule is @Global
// so feature modules can inject SQLITE without re-importing it.
@Module({
  imports: [DatabaseModule, McpModule],
})
export class AppModule {}
