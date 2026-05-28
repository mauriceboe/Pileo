import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/task.service.js', () => ({
  list: vi.fn(),
  create: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  move: vi.fn(),
  updateAssignees: vi.fn(),
  updateLabels: vi.fn(),
  bulkMove: vi.fn(),
  bulkDuplicate: vi.fn(),
  getContext: vi.fn(),
}));

import * as taskService from '../../services/task.service.js';
import {
  BoardTasksController,
  ColumnTasksController,
  TasksController,
} from './tasks.controller.js';

const USER = { id: 'u1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('BoardTasksController', () => {
  it('list forwards (boardId, userId)', async () => {
    vi.mocked(taskService.list).mockResolvedValue({ c1: [] } as never);
    await new BoardTasksController().list('b1', USER);
    expect(taskService.list).toHaveBeenCalledWith('b1', 'u1');
  });
});

describe('ColumnTasksController', () => {
  it('create forwards (columnId, userId, body)', async () => {
    vi.mocked(taskService.create).mockResolvedValue({ id: 't1' } as never);
    await new ColumnTasksController().create('c1', { title: 'New' } as never, USER);
    expect(taskService.create).toHaveBeenCalledWith('c1', 'u1', { title: 'New' });
  });
});

describe('TasksController', () => {
  const ctrl = new TasksController();

  it('getById forwards (taskId, userId)', async () => {
    vi.mocked(taskService.getById).mockResolvedValue({ id: 't1' } as never);
    await ctrl.getById('t1', USER);
    expect(taskService.getById).toHaveBeenCalledWith('t1', 'u1');
  });

  it('getContext forwards (taskId, userId)', async () => {
    vi.mocked(taskService.getContext).mockResolvedValue({ boardId: 'b1' } as never);
    await ctrl.getContext('t1', USER);
    expect(taskService.getContext).toHaveBeenCalledWith('t1', 'u1');
  });

  it('update forwards (taskId, userId, body)', async () => {
    vi.mocked(taskService.update).mockResolvedValue({ id: 't1' } as never);
    await ctrl.update('t1', { title: 'Renamed' } as never, USER);
    expect(taskService.update).toHaveBeenCalledWith('t1', 'u1', { title: 'Renamed' });
  });

  it('remove forwards (taskId, userId) and returns void', async () => {
    vi.mocked(taskService.remove).mockResolvedValue(undefined as never);
    expect(await ctrl.remove('t1', USER)).toBeUndefined();
    expect(taskService.remove).toHaveBeenCalledWith('t1', 'u1');
  });

  it('move forwards (taskId, userId, body)', async () => {
    vi.mocked(taskService.move).mockResolvedValue({ id: 't1' } as never);
    await ctrl.move('t1', { columnId: 'c2', position: 0 } as never, USER);
    expect(taskService.move).toHaveBeenCalledWith('t1', 'u1', { columnId: 'c2', position: 0 });
  });

  it('updateAssignees forwards add/remove arrays', async () => {
    vi.mocked(taskService.updateAssignees).mockResolvedValue({ id: 't1' } as never);
    await ctrl.updateAssignees('t1', { add: ['u2'], remove: [] } as never, USER);
    expect(taskService.updateAssignees).toHaveBeenCalledWith('t1', 'u1', { add: ['u2'], remove: [] });
  });

  it('updateLabels forwards add/remove arrays', async () => {
    vi.mocked(taskService.updateLabels).mockResolvedValue({ id: 't1' } as never);
    await ctrl.updateLabels('t1', { add: ['l1'], remove: ['l2'] } as never, USER);
    expect(taskService.updateLabels).toHaveBeenCalledWith('t1', 'u1', { add: ['l1'], remove: ['l2'] });
  });

  it('bulkMove forwards (taskIds, targetColumnId, userId) in service argument order', async () => {
    vi.mocked(taskService.bulkMove).mockResolvedValue({ moved: 2 } as never);
    await ctrl.bulkMove({ taskIds: ['t1', 't2'], targetColumnId: 'c3' } as never, USER);
    expect(taskService.bulkMove).toHaveBeenCalledWith(['t1', 't2'], 'c3', 'u1');
  });

  it('bulkDuplicate uses the same arg order as bulkMove', async () => {
    vi.mocked(taskService.bulkDuplicate).mockResolvedValue({ duplicated: 2 } as never);
    await ctrl.bulkDuplicate({ taskIds: ['t1', 't2'], targetColumnId: 'c3' } as never, USER);
    expect(taskService.bulkDuplicate).toHaveBeenCalledWith(['t1', 't2'], 'c3', 'u1');
  });
});
