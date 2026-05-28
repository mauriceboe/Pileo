import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/column.service.js', () => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

import * as columnService from '../../services/column.service.js';
import { BoardColumnsController, ColumnsController } from './columns.controller.js';

const USER = { id: 'u1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('BoardColumnsController', () => {
  it('create forwards (boardId, userId, body)', async () => {
    vi.mocked(columnService.create).mockResolvedValue({ id: 'c1' } as never);
    await new BoardColumnsController().create('b1', { name: 'Todo' } as never, USER);
    expect(columnService.create).toHaveBeenCalledWith('b1', 'u1', { name: 'Todo' });
  });
});

describe('ColumnsController', () => {
  const ctrl = new ColumnsController();

  it('update forwards (columnId, userId, body)', async () => {
    vi.mocked(columnService.update).mockResolvedValue({ id: 'c1' } as never);
    await ctrl.update('c1', { name: 'Doing' } as never, USER);
    expect(columnService.update).toHaveBeenCalledWith('c1', 'u1', { name: 'Doing' });
  });

  it('remove forwards (columnId, userId)', async () => {
    vi.mocked(columnService.remove).mockResolvedValue(undefined as never);
    expect(await ctrl.remove('c1', USER)).toBeUndefined();
    expect(columnService.remove).toHaveBeenCalledWith('c1', 'u1');
  });
});
