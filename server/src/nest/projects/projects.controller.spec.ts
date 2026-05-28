import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/project.service.js', () => ({
  list: vi.fn(),
  create: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  archive: vi.fn(),
  updateBackground: vi.fn(),
}));

import * as projectService from '../../services/project.service.js';
import { ProjectsController } from './projects.controller.js';
import { ValidationError } from '../../utils/errors.js';

const USER = { id: 'u1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('ProjectsController', () => {
  const ctrl = new ProjectsController();

  it('list forwards userId', async () => {
    vi.mocked(projectService.list).mockResolvedValue([{ id: 'p1' }] as never);
    expect(await ctrl.list(USER)).toEqual({ data: [{ id: 'p1' }] });
    expect(projectService.list).toHaveBeenCalledWith('u1');
  });

  it('create forwards (body, userId) — legacy parameter order', async () => {
    vi.mocked(projectService.create).mockResolvedValue({ id: 'p1' } as never);
    await ctrl.create({ name: 'TREK' } as never, USER);
    expect(projectService.create).toHaveBeenCalledWith({ name: 'TREK' }, 'u1');
  });

  it('get forwards (projectId, userId)', async () => {
    vi.mocked(projectService.getById).mockResolvedValue({ id: 'p1' } as never);
    await ctrl.get('p1', USER);
    expect(projectService.getById).toHaveBeenCalledWith('p1', 'u1');
  });

  it('update forwards (projectId, userId, body)', async () => {
    vi.mocked(projectService.update).mockResolvedValue({ id: 'p1' } as never);
    await ctrl.update('p1', { name: 'Renamed' } as never, USER);
    expect(projectService.update).toHaveBeenCalledWith('p1', 'u1', { name: 'Renamed' });
  });

  it('remove forwards (projectId, userId)', async () => {
    vi.mocked(projectService.remove).mockResolvedValue(undefined as never);
    expect(await ctrl.remove('p1', USER)).toBeUndefined();
    expect(projectService.remove).toHaveBeenCalledWith('p1', 'u1');
  });

  it('archive forwards (projectId, userId)', async () => {
    vi.mocked(projectService.archive).mockResolvedValue({ id: 'p1' } as never);
    await ctrl.archive('p1', USER);
    expect(projectService.archive).toHaveBeenCalledWith('p1', 'u1');
  });

  it('updateBackground rejects missing file with exact legacy message', async () => {
    await expect(ctrl.updateBackground('p1', undefined, USER))
      .rejects.toEqual(new ValidationError('No file provided'));
    expect(projectService.updateBackground).not.toHaveBeenCalled();
  });

  it('updateBackground forwards /uploads/<filename> to the service', async () => {
    vi.mocked(projectService.updateBackground).mockResolvedValue({ id: 'p1' } as never);
    const file = { filename: 'abc.jpg' } as Express.Multer.File;
    await ctrl.updateBackground('p1', file, USER);
    expect(projectService.updateBackground).toHaveBeenCalledWith('p1', 'u1', '/uploads/abc.jpg');
  });
});
