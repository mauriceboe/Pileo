import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/label.service.js', () => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

import * as labelService from '../../services/label.service.js';
import { LabelsController, ProjectLabelsController } from './labels.controller.js';

const USER = { id: 'user-1' } as never;

describe('ProjectLabelsController', () => {
  const ctrl = new ProjectLabelsController();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list passes (projectId, userId) and wraps the response in { data }', async () => {
    vi.mocked(labelService.list).mockResolvedValue([{ id: 'l1' }] as never);
    const result = await ctrl.list('p1', USER);
    expect(labelService.list).toHaveBeenCalledWith('p1', 'user-1');
    expect(result).toEqual({ data: [{ id: 'l1' }] });
  });

  it('create passes (projectId, userId, body) and wraps the response in { data }', async () => {
    vi.mocked(labelService.create).mockResolvedValue({ id: 'l1', name: 'Bug' } as never);
    const body = { name: 'Bug', color: '#ef4444' };
    const result = await ctrl.create('p1', body, USER);
    expect(labelService.create).toHaveBeenCalledWith('p1', 'user-1', body);
    expect(result).toEqual({ data: { id: 'l1', name: 'Bug' } });
  });

  it('list propagates service errors (handled by AppErrorFilter at the boundary)', async () => {
    vi.mocked(labelService.list).mockRejectedValue(new Error('db down'));
    await expect(ctrl.list('p1', USER)).rejects.toThrow('db down');
  });
});

describe('LabelsController', () => {
  const ctrl = new LabelsController();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('update passes (labelId, userId, body) and wraps the response in { data }', async () => {
    vi.mocked(labelService.update).mockResolvedValue({ id: 'l1', name: 'Renamed' } as never);
    const body = { name: 'Renamed' };
    const result = await ctrl.update('l1', body, USER);
    expect(labelService.update).toHaveBeenCalledWith('l1', 'user-1', body);
    expect(result).toEqual({ data: { id: 'l1', name: 'Renamed' } });
  });

  it('remove passes (labelId, userId) and returns nothing (204 by decorator)', async () => {
    vi.mocked(labelService.remove).mockResolvedValue(undefined as never);
    const result = await ctrl.remove('l1', USER);
    expect(labelService.remove).toHaveBeenCalledWith('l1', 'user-1');
    expect(result).toBeUndefined();
  });
});
