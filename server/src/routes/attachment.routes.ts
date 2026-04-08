import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { ValidationError } from '../utils/errors.js';
import * as attachmentService from '../services/attachment.service.js';

// GET /tasks/:taskId/attachments, POST /tasks/:taskId/attachments
const taskAttachmentRouter = Router({ mergeParams: true });
taskAttachmentRouter.use(authenticate);

taskAttachmentRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const data = await attachmentService.list(
    req.params.taskId!,
    (req as AuthenticatedRequest).user.id,
  );
  res.status(200).json({ data });
});

taskAttachmentRouter.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw new ValidationError('No file provided');
    }

    const attachment = await attachmentService.upload(
      req.params.taskId!,
      (req as AuthenticatedRequest).user.id,
      req.file,
    );
    res.status(201).json({ data: attachment });
  },
);

// DELETE /attachments/:attachmentId, GET /attachments/:attachmentId/download
const attachmentRouter = Router();
attachmentRouter.use(authenticate);

attachmentRouter.delete('/:attachmentId', async (req: Request, res: Response): Promise<void> => {
  await attachmentService.remove(
    req.params.attachmentId!,
    (req as AuthenticatedRequest).user.id,
  );
  res.status(204).send();
});

attachmentRouter.get('/:attachmentId/download', async (req: Request, res: Response): Promise<void> => {
  const { filePath, fileName, mimeType } = await attachmentService.download(
    req.params.attachmentId!,
    (req as AuthenticatedRequest).user.id,
  );

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.sendFile(filePath);
});

export { taskAttachmentRouter, attachmentRouter };
