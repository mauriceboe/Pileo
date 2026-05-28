import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/share.service.js', () => ({
  createShareLink: vi.fn(),
  getShareLink: vi.fn(),
  deleteShareLink: vi.fn(),
}));

import * as shareService from '../../services/share.service.js';
import { BoardShareLinkController } from './share.controller.js';

const USER = { id: 'u1' } as never;

beforeEach(() => vi.clearAllMocks());

function makeRes() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json } as never;
}

describe('BoardShareLinkController', () => {
  const ctrl = new BoardShareLinkController();

  it('create returns 201 when the link was newly issued', async () => {
    vi.mocked(shareService.createShareLink).mockResolvedValue({ token: 'tk', created: true } as never);
    const res = makeRes();
    await ctrl.create('b1', USER, res);
    expect(shareService.createShareLink).toHaveBeenCalledWith('b1', 'u1');
    expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(201);
  });

  it('create returns 200 when the link already existed (legacy quirk)', async () => {
    vi.mocked(shareService.createShareLink).mockResolvedValue({ token: 'tk', created: false } as never);
    const res = makeRes();
    await ctrl.create('b1', USER, res);
    expect((res as { status: ReturnType<typeof vi.fn> }).status).toHaveBeenCalledWith(200);
  });

  it('get forwards (boardId, userId)', async () => {
    vi.mocked(shareService.getShareLink).mockResolvedValue({ token: 'tk', enabled: true } as never);
    expect(await ctrl.get('b1', USER)).toEqual({ data: { token: 'tk', enabled: true } });
  });

  it('remove forwards (boardId, userId) and returns void', async () => {
    vi.mocked(shareService.deleteShareLink).mockResolvedValue(undefined as never);
    expect(await ctrl.remove('b1', USER)).toBeUndefined();
    expect(shareService.deleteShareLink).toHaveBeenCalledWith('b1', 'u1');
  });
});
