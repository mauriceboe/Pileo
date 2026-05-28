import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/attachment.service.js', () => ({
  list: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  download: vi.fn(),
}));

import * as attachmentService from '../../services/attachment.service.js';
import { AttachmentsController, TaskAttachmentsController } from './attachments.controller.js';
import { ValidationError } from '../../utils/errors.js';

const USER = { id: 'u1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('TaskAttachmentsController', () => {
  const ctrl = new TaskAttachmentsController();

  it('list forwards (taskId, userId)', async () => {
    vi.mocked(attachmentService.list).mockResolvedValue([{ id: 'a1' }] as never);
    expect(await ctrl.list('t1', USER)).toEqual({ data: [{ id: 'a1' }] });
    expect(attachmentService.list).toHaveBeenCalledWith('t1', 'u1');
  });

  it('upload without file rejects with the legacy message', async () => {
    await expect(ctrl.upload('t1', undefined, USER))
      .rejects.toEqual(new ValidationError('No file provided'));
    expect(attachmentService.upload).not.toHaveBeenCalled();
  });

  it('upload forwards the multer file object verbatim to the service', async () => {
    vi.mocked(attachmentService.upload).mockResolvedValue({ id: 'a1' } as never);
    const file = { filename: 'x.pdf', originalname: 'x.pdf' } as Express.Multer.File;
    await ctrl.upload('t1', file, USER);
    expect(attachmentService.upload).toHaveBeenCalledWith('t1', 'u1', file);
  });
});

describe('AttachmentsController', () => {
  it('remove forwards (attachmentId, userId)', async () => {
    vi.mocked(attachmentService.remove).mockResolvedValue(undefined as never);
    expect(await new AttachmentsController().remove('a1', USER)).toBeUndefined();
    expect(attachmentService.remove).toHaveBeenCalledWith('a1', 'u1');
  });

  it('download sets Content-Type, Content-Disposition and streams the file', async () => {
    vi.mocked(attachmentService.download).mockResolvedValue({
      filePath: '/uploads/x.pdf',
      fileName: 'doc with spaces.pdf',
      mimeType: 'application/pdf',
    } as never);
    const headers: Record<string, string> = {};
    const sendFile = vi.fn();
    const res = {
      setHeader: vi.fn((k: string, v: string) => { headers[k] = v; }),
      sendFile,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    await new AttachmentsController().download('a1', res, USER);
    expect(headers['Content-Type']).toBe('application/pdf');
    expect(headers['Content-Disposition']).toBe(`attachment; filename="${encodeURIComponent('doc with spaces.pdf')}"`);
    expect(sendFile).toHaveBeenCalledWith('/uploads/x.pdf');
  });
});
