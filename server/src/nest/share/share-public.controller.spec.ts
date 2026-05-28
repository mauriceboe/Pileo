import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/share.service.js', () => ({
  getSharedBoardData: vi.fn(),
}));
// The express-rate-limit middleware is bypassed in unit tests — call
// next() immediately so we exercise the controller body.
vi.mock('../../middleware/rate-limit.middleware.js', () => ({
  shareTokenRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import * as shareService from '../../services/share.service.js';
import { SharePublicController } from './share-public.controller.js';

beforeEach(() => vi.clearAllMocks());

function makeRes() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const writeHead = vi.fn();
  const write = vi.fn();
  return { status, json, writeHead, write } as never;
}

describe('SharePublicController.getBoard', () => {
  const ctrl = new SharePublicController();

  it('returns 200 with the board data when the token resolves', async () => {
    vi.mocked(shareService.getSharedBoardData).mockResolvedValue({ board: { id: 'b1' } } as never);
    const res = makeRes();
    await ctrl.getBoard('tk', {} as never, res);
    expect(shareService.getSharedBoardData).toHaveBeenCalledWith('tk');
    expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(200);
    expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith({ data: { board: { id: 'b1' } } });
  });

  it('returns 404 with the legacy envelope when the token is invalid', async () => {
    vi.mocked(shareService.getSharedBoardData).mockResolvedValue(null as never);
    const res = makeRes();
    await ctrl.getBoard('bad', {} as never, res);
    expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(404);
    expect((res as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Invalid or expired link' },
    });
  });
});

describe('SharePublicController.viewers (SSE)', () => {
  const ctrl = new SharePublicController();

  function sseRes() {
    return {
      writeHead: vi.fn(),
      write: vi.fn(),
    } as never;
  }
  function sseReq(closeHandler: () => void) {
    const handlers: Record<string, () => void> = {};
    return {
      on: vi.fn((event: string, fn: () => void) => {
        handlers[event] = fn;
      }),
      __close: () => closeHandler ?? handlers['close']?.(),
      __triggerClose: () => handlers['close']?.(),
    } as unknown as Parameters<typeof ctrl.viewers>[1] & { __triggerClose: () => void };
  }

  it('writes the SSE preamble and pushes the initial viewer count', () => {
    const req = sseReq(() => undefined);
    const res = sseRes();
    ctrl.viewers('tk', req, res);
    expect((res as { writeHead: ReturnType<typeof vi.fn> }).writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    // First viewer of this token → count = 1
    expect((res as { write: ReturnType<typeof vi.fn> }).write).toHaveBeenCalledWith('data: {"count":1}\n\n');
  });

  it('broadcasts the updated count when a second viewer connects', () => {
    const req1 = sseReq(() => undefined);
    const res1 = sseRes();
    ctrl.viewers('tk2', req1, res1);

    const req2 = sseReq(() => undefined);
    const res2 = sseRes();
    ctrl.viewers('tk2', req2, res2);

    // Both viewers receive the count-=2 fan-out
    expect((res1 as { write: ReturnType<typeof vi.fn> }).write).toHaveBeenLastCalledWith('data: {"count":2}\n\n');
    expect((res2 as { write: ReturnType<typeof vi.fn> }).write).toHaveBeenLastCalledWith('data: {"count":2}\n\n');
  });

  it('drops a viewer from the registry when the request closes', () => {
    const req1 = sseReq(() => undefined);
    const res1 = sseRes();
    ctrl.viewers('tk3', req1, res1);

    const req2 = sseReq(() => undefined);
    const res2 = sseRes();
    ctrl.viewers('tk3', req2, res2);

    // First viewer disconnects → count for remaining viewer goes to 1
    (req1 as unknown as { __triggerClose: () => void }).__triggerClose();
    expect((res2 as { write: ReturnType<typeof vi.fn> }).write).toHaveBeenLastCalledWith('data: {"count":1}\n\n');
  });
});
