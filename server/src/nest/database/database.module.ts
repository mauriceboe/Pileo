import { Global, Module } from '@nestjs/common';
import { sqlite } from '../../config/database.js';
import { SQLITE } from './database.tokens.js';

// Wrap the existing better-sqlite3 instance as a Nest provider. We keep a
// single writer across both Express and Nest — opening a second connection
// to the same file would defeat WAL's single-writer guarantee and break
// transaction visibility between the two halves of the app.
@Global()
@Module({
  providers: [{ provide: SQLITE, useValue: sqlite }],
  exports: [SQLITE],
})
export class DatabaseModule {}
