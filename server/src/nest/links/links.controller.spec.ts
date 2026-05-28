import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/link.service.js', () => ({
  list: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
}));

import * as linkService from '../../services/link.service.js';
import { LinksController, TaskLinksController } from './links.controller.js';

const USER = { id: 'u1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('TaskLinksController', () => {
  const ctrl = new TaskLinksController();

  it('list wraps in { data }', async () => {
    vi.mocked(linkService.list).mockResolvedValue([{ id: 'l1' }] as never);
    expect(await ctrl.list('t1', USER)).toEqual({ data: [{ id: 'l1' }] });
    expect(linkService.list).toHaveBeenCalledWith('t1', 'u1');
  });

  it('create forwards body.url verbatim (legacy did no validation)', async () => {
    vi.mocked(linkService.create).mockResolvedValue({ id: 'l1' } as never);
    await ctrl.create('t1', { url: 'https://x.test' }, USER);
    expect(linkService.create).toHaveBeenCalledWith('t1', 'u1', 'https://x.test');
  });
});

describe('LinksController', () => {
  it('remove forwards (linkId, userId) and returns void', async () => {
    vi.mocked(linkService.remove).mockResolvedValue(undefined as never);
    expect(await new LinksController().remove('l1', USER)).toBeUndefined();
    expect(linkService.remove).toHaveBeenCalledWith('l1', 'u1');
  });
});
