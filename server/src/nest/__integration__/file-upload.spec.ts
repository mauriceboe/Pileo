import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, FileInterceptor, type NestExpressApplication } from '@nestjs/platform-express';
import {
  Body,
  Controller,
  Module,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import request from 'supertest';
import { tmpdir } from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import multer from 'multer';
import { ValidationError } from '../../utils/errors.js';
import { AppErrorFilter } from '../error/app-error.filter.js';

// Proves @UseInterceptors(FileInterceptor) wires multer into Nest end-to-end:
// missing file → 400 ValidationError envelope, present file → echo back
// what multer stored on disk.

// Decorators evaluate at class declaration time, so destination must read
// the upload dir lazily via the callback rather than captured up-front.
const uploadOptions = {
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, globalThis.UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `test-${file.originalname}`),
  }),
  limits: { fileSize: 1024 * 1024 },
};

@Controller('upload')
class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  upload(@UploadedFile() file: Express.Multer.File | undefined, @Body() body: Record<string, string>) {
    if (!file) throw new ValidationError('No file provided');
    return {
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      note: body['note'] ?? null,
    };
  }
}

@Module({ controllers: [UploadController] })
class UploadModule {}

declare global {
  // eslint-disable-next-line no-var
  var UPLOAD_DIR: string;
}

describe('file-upload integration', () => {
  let app: NestExpressApplication;
  let server: ReturnType<typeof express>;
  let uploadDir: string;

  beforeAll(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), 'pileo-upload-test-'));
    globalThis.UPLOAD_DIR = uploadDir;
    server = express();
    app = await NestFactory.create<NestExpressApplication>(
      UploadModule,
      new ExpressAdapter(server),
      { logger: false },
    );
    app.useGlobalFilters(new AppErrorFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await rm(uploadDir, { recursive: true, force: true });
  });

  it('rejects requests without a file with the standard 400 envelope', async () => {
    const res = await request(server).post('/upload');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'No file provided' },
    });
  });

  it('stores the file on disk and returns the multer metadata', async () => {
    const res = await request(server)
      .post('/upload')
      .field('note', 'pile-up')
      .attach('file', Buffer.from('hello pileo'), 'hello.txt');
    expect(res.status).toBe(201);
    expect(res.body.filename).toBe('test-hello.txt');
    expect(res.body.originalname).toBe('hello.txt');
    expect(res.body.size).toBe(11);
    expect(res.body.note).toBe('pile-up');
  });
});
