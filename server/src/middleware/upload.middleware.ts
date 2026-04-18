import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { ValidationError } from '../utils/errors.js';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_DOCUMENT_EXTENSIONS,
  ALLOWED_ARCHIVE_EXTENSIONS,
  ALLOWED_3D_MODEL_EXTENSIONS,
} from '@pileo/shared';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/zip',
  'application/gzip',
  // 3D model formats — browsers usually send these as octet-stream because
  // there is no widely registered MIME, so we also accept binary fallbacks below.
  'model/3mf',
  'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
  'model/stl',
  'application/sla',
  'application/vnd.ms-pki.stl',
  'model/obj',
  'application/x-tgif',
  'application/step',
  'model/step',
  'text/x-gcode',
]);

const ALLOWED_EXTENSIONS: Set<string> = new Set([
  ...ALLOWED_IMAGE_EXTENSIONS,
  ...ALLOWED_DOCUMENT_EXTENSIONS,
  ...ALLOWED_ARCHIVE_EXTENSIONS,
  ...ALLOWED_3D_MODEL_EXTENSIONS,
]);

// Extensions where we accept generic binary MIME types (application/octet-stream)
// because browsers rarely have a registered type for them.
const BINARY_FALLBACK_EXTENSIONS: Set<string> = new Set([
  ...ALLOWED_3D_MODEL_EXTENSIONS,
]);

const BINARY_FALLBACK_MIME_TYPES = new Set([
  'application/octet-stream',
  'binary/octet-stream',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, env.PILEO_UPLOAD_DIR);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}${extension}`;
    callback(null, filename);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
): void {
  const extension = path.extname(file.originalname).toLowerCase().slice(1);

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    callback(new ValidationError('File type not allowed'));
    return;
  }

  const mimeAllowed =
    ALLOWED_MIME_TYPES.has(file.mimetype) ||
    (BINARY_FALLBACK_EXTENSIONS.has(extension) && BINARY_FALLBACK_MIME_TYPES.has(file.mimetype));

  if (!mimeAllowed) {
    callback(new ValidationError('File type not allowed'));
    return;
  }

  callback(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.PILEO_MAX_FILE_SIZE,
  },
});
