// Multer options shared by every Nest controller that accepts file
// uploads. Mirrors server/src/middleware/upload.middleware.ts so the
// Nest side enforces the same allow-list of extensions / MIME types as
// the legacy Express stack. Keeping the two in sync is a known debt; if
// either changes, the other has to follow.

import multer from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { ValidationError } from '../../utils/errors.js';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_DOCUMENT_EXTENSIONS,
  ALLOWED_ARCHIVE_EXTENSIONS,
  ALLOWED_3D_MODEL_EXTENSIONS,
} from '@pileo/shared';

const ALLOWED_MIME_TYPES = new Set<string>([
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

const ALLOWED_EXTENSIONS = new Set<string>([
  ...ALLOWED_IMAGE_EXTENSIONS,
  ...ALLOWED_DOCUMENT_EXTENSIONS,
  ...ALLOWED_ARCHIVE_EXTENSIONS,
  ...ALLOWED_3D_MODEL_EXTENSIONS,
]);

const BINARY_FALLBACK_EXTENSIONS = new Set<string>([...ALLOWED_3D_MODEL_EXTENSIONS]);
const BINARY_FALLBACK_MIME_TYPES = new Set([
  'application/octet-stream',
  'binary/octet-stream',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.PILEO_UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

function fileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    cb(new ValidationError('File type not allowed'));
    return;
  }
  const mimeAllowed =
    ALLOWED_MIME_TYPES.has(file.mimetype) ||
    (BINARY_FALLBACK_EXTENSIONS.has(ext) && BINARY_FALLBACK_MIME_TYPES.has(file.mimetype));
  if (!mimeAllowed) {
    cb(new ValidationError('File type not allowed'));
    return;
  }
  cb(null, true);
}

// Cast through unknown because Nest's MulterOptions widens FileFilterCallback's
// "error" param to Error|null while multer's own type is stricter — the
// runtime callback shape is identical so the cast is safe.
export const uploadOptions = {
  storage,
  fileFilter,
  limits: { fileSize: env.PILEO_MAX_FILE_SIZE },
} as unknown as MulterOptions;
