import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import type { Express } from 'express';
import { AppModule } from './app.module.js';

export interface NestHandle {
  instance: Express;
  close: () => Promise<void>;
}

// Build a NestJS app on top of a fresh Express instance.
// The instance is returned (not listen()'d) so the top-level dispatcher in
// index.ts can decide per-prefix which app handles each request.
export async function createNestApp(): Promise<NestHandle> {
  const expressInstance = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressInstance),
    {
      logger: ['error', 'warn', 'log'],
      bodyParser: false,
    },
  );

  await app.init();
  return {
    instance: expressInstance,
    close: () => app.close(),
  };
}
