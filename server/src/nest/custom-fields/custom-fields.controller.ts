import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { AppError, ValidationError } from '../../utils/errors.js';
import * as svc from '../../services/custom-field.service.js';
import type { CustomField } from '../../services/custom-field.service.js';

// No ZodValidationPipe: legacy emitted plain messages without a
// {path,message} details array, and clients depend on that shape.

interface CreateFieldBody {
  name?: unknown;
  type?: unknown;
  options?: unknown;
  showOnCard?: unknown;
}
interface ReorderBody { fieldIds?: unknown }
interface ValueBody { value?: unknown }

const VALID_TYPES = ['dropdown', 'checklist', 'text_small', 'text_large'] as const;
type FieldType = typeof VALID_TYPES[number];

function parseCreate(body: CreateFieldBody) {
  if (typeof body.name !== 'string' || !body.name || typeof body.type !== 'string') {
    throw new ValidationError('name and type are required');
  }
  if (!VALID_TYPES.includes(body.type as FieldType)) {
    throw new ValidationError('name and type are required');
  }
  return {
    name: body.name,
    type: body.type as FieldType,
    options: Array.isArray(body.options) ? (body.options.filter((o): o is string => typeof o === 'string')) : undefined,
    showOnCard: typeof body.showOnCard === 'boolean' ? body.showOnCard : undefined,
  };
}

function parseUpdate(body: CreateFieldBody & { isEnabled?: unknown }) {
  const patch: Parameters<typeof svc.updateField>[1] = {};
  if (typeof body.name === 'string') patch.name = body.name;
  if (typeof body.type === 'string' && VALID_TYPES.includes(body.type as FieldType)) patch.type = body.type as FieldType;
  if (Array.isArray(body.options)) patch.options = body.options.filter((o): o is string => typeof o === 'string');
  if (typeof body.showOnCard === 'boolean') patch.showOnCard = body.showOnCard;
  if (typeof body.isEnabled === 'boolean') patch.isEnabled = body.isEnabled;
  return patch;
}

// --- /api/v1/projects/:projectId/custom-fields --------------------------

@Controller('api/v1/projects/:projectId/custom-fields')
@UseGuards(PileoAuthGuard)
export class ProjectCustomFieldsController {
  @Get()
  list(@Param('projectId') projectId: string): { data: CustomField[] } {
    return { data: svc.listFields(projectId) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Param('projectId') projectId: string, @Body() body: CreateFieldBody): { data: CustomField } {
    const data = parseCreate(body);
    return { data: svc.createField(projectId, data) };
  }

  // PATCH /reorder must beat the @Patch(':fieldId') route in registration
  // order — Nest matches in declaration order, so reorder is defined first.
  @Patch('reorder')
  reorder(@Param('projectId') projectId: string, @Body() body: ReorderBody): { data: { message: string } } {
    if (!Array.isArray(body.fieldIds)) {
      throw new ValidationError('fieldIds array required');
    }
    const ids = body.fieldIds.filter((id): id is string => typeof id === 'string');
    svc.reorderFields(projectId, ids);
    return { data: { message: 'Reordered' } };
  }
}

// --- /api/v1/custom-fields/:fieldId -------------------------------------

@Controller('api/v1/custom-fields')
@UseGuards(PileoAuthGuard)
export class CustomFieldsController {
  @Patch(':fieldId')
  update(@Param('fieldId') fieldId: string, @Body() body: CreateFieldBody & { isEnabled?: unknown }): { data: CustomField } {
    try {
      return { data: svc.updateField(fieldId, parseUpdate(body)) };
    } catch (err) {
      // service throws a plain Error('Field not found'); map to 404.
      if (err instanceof ValidationError) throw err;
      throw new AppError('Field not found', 404, 'NOT_FOUND');
    }
  }

  @Delete(':fieldId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('fieldId') fieldId: string): void {
    svc.deleteField(fieldId);
  }
}

// --- /api/v1/tasks/:taskId/custom-values --------------------------------

@Controller('api/v1/tasks/:taskId/custom-values')
@UseGuards(PileoAuthGuard)
export class TaskCustomValuesController {
  @Get()
  list(@Param('taskId') taskId: string): { data: ReturnType<typeof svc.getTaskValues> } {
    return { data: svc.getTaskValues(taskId) };
  }

  @Put(':fieldId')
  set(
    @Param('taskId') taskId: string,
    @Param('fieldId') fieldId: string,
    @Body() body: ValueBody,
  ): { data: ReturnType<typeof svc.setTaskValue> } {
    if (typeof body.value !== 'string') {
      throw new ValidationError('value is required');
    }
    return { data: svc.setTaskValue(taskId, fieldId, body.value) };
  }

  @Delete(':fieldId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('taskId') taskId: string, @Param('fieldId') fieldId: string): void {
    svc.deleteTaskValue(taskId, fieldId);
  }
}
