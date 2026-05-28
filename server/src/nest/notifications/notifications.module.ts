import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { AuthModule } from '../auth/auth.module.js';

// Only the REST surface migrates. The WebSocket sync path
// (notificationService.create + WS broadcast in websocket/server.ts)
// remains on the legacy stack — it has its own clients and would need
// a coordinated migration of the WS server, which is out of scope here.
@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
