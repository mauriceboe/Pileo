import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { PileoAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ValidationError } from '../../utils/errors.js';
import { uploadOptions } from '../upload/upload.config.js';
import * as attachmentService from '../../services/attachment.service.js';

@Controller('api/v1/tasks/:taskId/attachments')
@UseGuards(PileoAuthGuard)
export class TaskAttachmentsController {
  @Get()
  async list(
    @Param('taskId') taskId: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    return { data: await attachmentService.list(taskId, user.id) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  async upload(
    @Param('taskId') taskId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: unknown }> {
    if (!file) throw new ValidationError('No file provided');
    return { data: await attachmentService.upload(taskId, user.id, file) };
  }
}

@Controller('api/v1/attachments')
@UseGuards(PileoAuthGuard)
export class AttachmentsController {
  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await attachmentService.remove(attachmentId, user.id);
  }

  // sendFile() streams the response itself, so we declare passthrough: false
  // (the default) and write headers + body via @Res(). This is the one place
  // the controller talks to Express directly — there's no clean way around
  // streaming a file with Nest's standard return-shape pattern.
  @Get(':attachmentId/download')
  async download(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    const { filePath, fileName, mimeType } = await attachmentService.download(attachmentId, user.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.sendFile(filePath);
  }
}
