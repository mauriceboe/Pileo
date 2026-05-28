import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller.js';

// Pileo MCP — first NestJS-native domain module.
// Mounts at /api/v1/mcp. Authentication is done inside the controller (not
// PileoAuthGuard) because MCP needs raw access to the Authorization header
// to emit a spec-correct WWW-Authenticate challenge with the resource hint.
@Module({
  controllers: [McpController],
})
export class McpModule {}
