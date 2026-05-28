import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/board.service.js', () => ({
  list: vi.fn(),
  create: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  reorderColumns: vi.fn(),
}));

import * as boardService from '../../services/board.service.js';
import { BoardsController, ProjectBoardsController } from './boards.controller.js';

const USER = { id: 'u1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('ProjectBoardsController', () => {
  const ctrl = new ProjectBoardsController();

  it('list forwards (projectId, userId)', async () => {
    vi.mocked(boardService.list).mockResolvedValue([{ id: 'b1' }] as never);
    expect(await ctrl.list('p1', USER)).toEqual({ data: [{ id: 'b1' }] });
    expect(boardService.list).toHaveBeenCalledWith('p1', 'u1');
  });

  it('create forwards (projectId, userId, body)', async () => {
    vi.mocked(boardService.create).mockResolvedValue({ id: 'b1' } as never);
    await ctrl.create('p1', { name: 'Sprint 1' } as never, USER);
    expect(boardService.create).toHaveBeenCalledWith('p1', 'u1', { name: 'Sprint 1' });
  });
});

describe('BoardsController', () => {
  const ctrl = new BoardsController();

  it('get forwards (boardId, userId)', async () => {
    vi.mocked(boardService.getById).mockResolvedValue({ id: 'b1' } as never);
    await ctrl.get('b1', USER);
    expect(boardService.getById).toHaveBeenCalledWith('b1', 'u1');
  });

  it('update forwards (boardId, userId, body)', async () => {
    vi.mocked(boardService.update).mockResolvedValue({ id: 'b1' } as never);
    await ctrl.update('b1', { name: 'Renamed' } as never, USER);
    expect(boardService.update).toHaveBeenCalledWith('b1', 'u1', { name: 'Renamed' });
  });

  it('remove forwards (boardId, userId)', async () => {
    vi.mocked(boardService.remove).mockResolvedValue(undefined as never);
    expect(await ctrl.remove('b1', USER)).toBeUndefined();
    expect(boardService.remove).toHaveBeenCalledWith('b1', 'u1');
  });

  it('reorderColumns returns the exact legacy message', async () => {
    vi.mocked(boardService.reorderColumns).mockResolvedValue(undefined as never);
    const result = await ctrl.reorderColumns('b1', { columnIds: ['c1', 'c2'] } as never, USER);
    expect(boardService.reorderColumns).toHaveBeenCalledWith('b1', 'u1', ['c1', 'c2']);
    expect(result).toEqual({ data: { message: 'Columns reordered successfully' } });
  });
});
