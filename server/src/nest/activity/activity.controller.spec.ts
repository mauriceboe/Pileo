import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/activity.service.js', () => ({
  getForProject: vi.fn(),
  getForTask: vi.fn(),
}));

import * as activityService from '../../services/activity.service.js';
import { ProjectActivityController, TaskActivityController } from './activity.controller.js';

const USER = { id: 'user-1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('ProjectActivityController', () => {
  it('forwards (projectId, userId) and wraps result in { data }', async () => {
    vi.mocked(activityService.getForProject).mockResolvedValue([{ id: 'a1' }] as never);
    const result = await new ProjectActivityController().list('p1', USER);
    expect(activityService.getForProject).toHaveBeenCalledWith('p1', 'user-1');
    expect(result).toEqual({ data: [{ id: 'a1' }] });
  });
});

describe('TaskActivityController', () => {
  it('forwards (taskId, userId) and wraps result in { data }', async () => {
    vi.mocked(activityService.getForTask).mockResolvedValue([{ id: 'a1' }] as never);
    const result = await new TaskActivityController().list('t1', USER);
    expect(activityService.getForTask).toHaveBeenCalledWith('t1', 'user-1');
    expect(result).toEqual({ data: [{ id: 'a1' }] });
  });
});
