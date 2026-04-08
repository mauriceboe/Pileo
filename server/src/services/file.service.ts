import path from 'node:path';
import fs from 'node:fs/promises';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export function saveFile(file: Express.Multer.File): { fileName: string; filePath: string } {
  // multer already saved the file with a UUID filename via the upload middleware
  const relativePath = file.filename;
  return {
    fileName: file.originalname,
    filePath: relativePath,
  };
}

export async function deleteFile(relativePath: string): Promise<void> {
  const fullPath = path.resolve(env.PILEO_UPLOAD_DIR, relativePath);

  try {
    await fs.unlink(fullPath);
    logger.info({ path: fullPath }, 'File deleted from disk');
  } catch (error) {
    // Log but don't throw — file may already be deleted
    logger.warn({ path: fullPath, error }, 'Failed to delete file from disk');
  }
}

export function getFilePath(relativePath: string): string {
  return path.resolve(env.PILEO_UPLOAD_DIR, relativePath);
}
