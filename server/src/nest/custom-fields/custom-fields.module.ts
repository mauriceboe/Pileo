import { Module } from '@nestjs/common';
import {
  CustomFieldsController,
  ProjectCustomFieldsController,
  TaskCustomValuesController,
} from './custom-fields.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ProjectCustomFieldsController, CustomFieldsController, TaskCustomValuesController],
})
export class CustomFieldsModule {}
