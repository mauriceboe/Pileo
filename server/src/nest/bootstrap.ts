import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import type { Express } from 'express';
import { AppModule } from './app.module.js';
import { AppErrorFilter } from './error/app-error.filter.js';

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
      // bodyParser:true so @Body() controllers see a parsed body without
      // each module having to install its own json middleware. The dispatcher
      // in index.ts only forwards requests with raw bodies to one app or the
      // other — there is no double-parse with legacy Express, which parses
      // separately on its own instance.
      bodyParser: true,
    },
  );

  // Global filter — keeps the wire envelope identical to legacy Express
  // for every Nest-handled route.
  app.useGlobalFilters(new AppErrorFilter());

  await app.init();
  return {
    instance: expressInstance,
    close: () => app.close(),
  };
}
