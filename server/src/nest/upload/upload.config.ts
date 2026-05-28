// Multer options shared by every controller that accepts uploads:
// disk storage under PILEO_UPLOAD_DIR, an allow-list of file types
// (images, documents, archives, 3D models), and a max file size.

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

// Matches Nest's MulterOptions.fileFilter signature exactly (error param
// is Error|null, not just Error like multer's own type), so no cast needed.
const fileFilter: MulterOptions['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    cb(new ValidationError('File type not allowed'), false);
    return;
  }
  const mimeAllowed =
    ALLOWED_MIME_TYPES.has(file.mimetype) ||
    (BINARY_FALLBACK_EXTENSIONS.has(ext) && BINARY_FALLBACK_MIME_TYPES.has(file.mimetype));
  if (!mimeAllowed) {
    cb(new ValidationError('File type not allowed'), false);
    return;
  }
  cb(null, true);
};

export const uploadOptions: MulterOptions = {
  storage,
  fileFilter,
  limits: { fileSize: env.PILEO_MAX_FILE_SIZE },
};
