import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/share.service.js', () => ({
  getSharedBoardData: vi.fn(),
}));

import * as shareService from '../../services/share.service.js';
import { SharePublicController } from './share-public.controller.js';
import { AppError } from '../../utils/errors.js';

beforeEach(() => vi.clearAllMocks());

describe('SharePublicController.getBoard', () => {
  const ctrl = new SharePublicController();

  it('returns { data: board } when the token resolves', async () => {
    vi.mocked(shareService.getSharedBoardData).mockResolvedValue({ board: { id: 'b1' } } as never);
    expect(await ctrl.getBoard('tk')).toEqual({ data: { board: { id: 'b1' } } });
    expect(shareService.getSharedBoardData).toHaveBeenCalledWith('tk');
  });

  it('throws AppError 404 NOT_FOUND when the token is invalid', async () => {
    vi.mocked(shareService.getSharedBoardData).mockResolvedValue(null as never);
    try {
      await ctrl.getBoard('bad');
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const ae = err as AppError;
      expect(ae.statusCode).toBe(404);
      expect(ae.code).toBe('NOT_FOUND');
      expect(ae.message).toBe('Invalid or expired link');
    }
  });
});

describe('SharePublicController.viewers (SSE)', () => {
  const ctrl = new SharePublicController();

  function sseRes() {
    return { writeHead: vi.fn(), write: vi.fn() } as never;
  }
  function sseReq() {
    const handlers: Record<string, () => void> = {};
    return {
      on: vi.fn((event: string, fn: () => void) => {
        handlers[event] = fn;
      }),
      __triggerClose: () => handlers['close']?.(),
    } as unknown as Parameters<typeof ctrl.viewers>[1] & { __triggerClose: () => void };
  }

  it('writes the SSE preamble and the initial viewer count', () => {
    const req = sseReq();
    const res = sseRes();
    ctrl.viewers('tk', req, res);
    expect((res as { writeHead: ReturnType<typeof vi.fn> }).writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    expect((res as { write: ReturnType<typeof vi.fn> }).write).toHaveBeenCalledWith('data: {"count":1}\n\n');
  });

  it('broadcasts the updated count when a second viewer connects', () => {
    const r1 = sseReq();
    const w1 = sseRes();
    ctrl.viewers('tk2', r1, w1);

    const r2 = sseReq();
    const w2 = sseRes();
    ctrl.viewers('tk2', r2, w2);

    expect((w1 as { write: ReturnType<typeof vi.fn> }).write).toHaveBeenLastCalledWith('data: {"count":2}\n\n');
    expect((w2 as { write: ReturnType<typeof vi.fn> }).write).toHaveBeenLastCalledWith('data: {"count":2}\n\n');
  });

  it('drops a viewer when the request closes', () => {
    const r1 = sseReq();
    const w1 = sseRes();
    ctrl.viewers('tk3', r1, w1);

    const r2 = sseReq();
    const w2 = sseRes();
    ctrl.viewers('tk3', r2, w2);

    (r1 as unknown as { __triggerClose: () => void }).__triggerClose();
    expect((w2 as { write: ReturnType<typeof vi.fn> }).write).toHaveBeenLastCalledWith('data: {"count":1}\n\n');
  });
});
