import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { McpModule } from './mcp/mcp.module.js';
import { LabelsModule } from './labels/labels.module.js';
import { CustomFieldsModule } from './custom-fields/custom-fields.module.js';
import { ActivityModule } from './activity/activity.module.js';
import { LinksModule } from './links/links.module.js';
import { ApiKeysModule } from './api-keys/api-keys.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { CommentsModule } from './comments/comments.module.js';
import { ChecklistsModule } from './checklists/checklists.module.js';

// Root NestJS module. Domain modules get added one at a time via the
// strangler-fig migration (see pileo-rewrite.md). DatabaseModule is @Global
// so feature modules can inject SQLITE without re-importing it.
@Module({
  imports: [
    DatabaseModule,
    McpModule,
    LabelsModule,
    CustomFieldsModule,
    ActivityModule,
    LinksModule,
    ApiKeysModule,
    NotificationsModule,
    CommentsModule,
    ChecklistsModule,
  ],
})
export class AppModule {}
