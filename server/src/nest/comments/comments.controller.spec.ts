import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/comment.service.js', () => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

import * as commentService from '../../services/comment.service.js';
import { CommentsController, TaskCommentsController } from './comments.controller.js';

const USER = { id: 'u1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('TaskCommentsController', () => {
  const ctrl = new TaskCommentsController();

  it('list forwards (taskId, userId) and wraps in {data}', async () => {
    vi.mocked(commentService.list).mockResolvedValue([{ id: 'c1' }] as never);
    expect(await ctrl.list('t1', USER)).toEqual({ data: [{ id: 'c1' }] });
    expect(commentService.list).toHaveBeenCalledWith('t1', 'u1');
  });

  it('create forwards (taskId, userId, content)', async () => {
    vi.mocked(commentService.create).mockResolvedValue({ id: 'c1' } as never);
    await ctrl.create('t1', { content: 'hi' }, USER);
    expect(commentService.create).toHaveBeenCalledWith('t1', 'u1', 'hi');
  });
});

describe('CommentsController', () => {
  const ctrl = new CommentsController();

  it('update forwards (commentId, userId, content)', async () => {
    vi.mocked(commentService.update).mockResolvedValue({ id: 'c1' } as never);
    await ctrl.update('c1', { content: 'edited' }, USER);
    expect(commentService.update).toHaveBeenCalledWith('c1', 'u1', 'edited');
  });

  it('remove forwards (commentId, userId)', async () => {
    vi.mocked(commentService.remove).mockResolvedValue(undefined as never);
    expect(await ctrl.remove('c1', USER)).toBeUndefined();
    expect(commentService.remove).toHaveBeenCalledWith('c1', 'u1');
  });
});
