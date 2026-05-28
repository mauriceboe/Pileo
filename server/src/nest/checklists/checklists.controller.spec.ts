import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/checklist.service.js', () => ({
  list: vi.fn(),
  create: vi.fn(),
  reorder: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

import * as svc from '../../services/checklist.service.js';
import { ChecklistController, TaskChecklistController } from './checklists.controller.js';

const USER = { id: 'u1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('TaskChecklistController', () => {
  const ctrl = new TaskChecklistController();

  it('list forwards (taskId, userId)', async () => {
    vi.mocked(svc.list).mockResolvedValue([{ id: 'i1' }] as never);
    expect(await ctrl.list('t1', USER)).toEqual({ data: [{ id: 'i1' }] });
    expect(svc.list).toHaveBeenCalledWith('t1', 'u1');
  });

  it('create forwards (taskId, userId, title)', async () => {
    vi.mocked(svc.create).mockResolvedValue({ id: 'i1' } as never);
    await ctrl.create('t1', { title: 'todo' }, USER);
    expect(svc.create).toHaveBeenCalledWith('t1', 'u1', 'todo');
  });

  it('reorder forwards (taskId, userId, itemIds)', async () => {
    vi.mocked(svc.reorder).mockResolvedValue([] as never);
    await ctrl.reorder('t1', { itemIds: ['a', 'b'] }, USER);
    expect(svc.reorder).toHaveBeenCalledWith('t1', 'u1', ['a', 'b']);
  });
});

describe('ChecklistController', () => {
  const ctrl = new ChecklistController();

  it('update forwards (itemId, userId, body)', async () => {
    vi.mocked(svc.update).mockResolvedValue({ id: 'i1', isCompleted: true } as never);
    await ctrl.update('i1', { isCompleted: true }, USER);
    expect(svc.update).toHaveBeenCalledWith('i1', 'u1', { isCompleted: true });
  });

  it('remove forwards (itemId, userId)', async () => {
    vi.mocked(svc.remove).mockResolvedValue(undefined as never);
    expect(await ctrl.remove('i1', USER)).toBeUndefined();
    expect(svc.remove).toHaveBeenCalledWith('i1', 'u1');
  });
});
