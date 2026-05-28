import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/user.service.js', () => ({
  getById: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  updateAvatar: vi.fn(),
}));
vi.mock('../../services/user-stats.service.js', () => ({
  listAssignedTasks: vi.fn(),
  getDashboardStats: vi.fn(),
}));

import * as userService from '../../services/user.service.js';
import * as userStats from '../../services/user-stats.service.js';
import { UsersController } from './users.controller.js';
import { ValidationError } from '../../utils/errors.js';

const USER = { id: 'u1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('UsersController', () => {
  const ctrl = new UsersController();

  it('me returns the user profile in { data }', async () => {
    vi.mocked(userService.getById).mockResolvedValue({ id: 'u1', username: 'maurice' } as never);
    expect(await ctrl.me(USER)).toEqual({ data: { id: 'u1', username: 'maurice' } });
    expect(userService.getById).toHaveBeenCalledWith('u1');
  });

  it('updateMe forwards (userId, body)', async () => {
    vi.mocked(userService.updateProfile).mockResolvedValue({ id: 'u1' } as never);
    await ctrl.updateMe({ displayName: 'Maurice B.' } as never, USER);
    expect(userService.updateProfile).toHaveBeenCalledWith('u1', { displayName: 'Maurice B.' });
  });

  it('updateAvatar rejects missing file with the legacy message', async () => {
    await expect(ctrl.updateAvatar(undefined, USER))
      .rejects.toEqual(new ValidationError('No file provided'));
    expect(userService.updateAvatar).not.toHaveBeenCalled();
  });

  it('updateAvatar forwards /uploads/<filename> path', async () => {
    vi.mocked(userService.updateAvatar).mockResolvedValue({ id: 'u1' } as never);
    const file = { filename: 'avatar.png' } as Express.Multer.File;
    await ctrl.updateAvatar(file, USER);
    expect(userService.updateAvatar).toHaveBeenCalledWith('u1', '/uploads/avatar.png');
  });

  it('changePassword returns the legacy success message envelope', async () => {
    vi.mocked(userService.changePassword).mockResolvedValue(undefined as never);
    const body = { currentPassword: 'old', newPassword: 'new123' } as never;
    expect(await ctrl.changePassword(body, USER)).toEqual({
      data: { message: 'Password changed successfully' },
    });
    expect(userService.changePassword).toHaveBeenCalledWith('u1', body);
  });

  it('myTasks delegates to user-stats.listAssignedTasks', async () => {
    vi.mocked(userStats.listAssignedTasks).mockResolvedValue([{ id: 't1', title: 'x' }] as never);
    expect(await ctrl.myTasks(USER)).toEqual({ data: [{ id: 't1', title: 'x' }] });
    expect(userStats.listAssignedTasks).toHaveBeenCalledWith('u1');
  });

  it('myStats delegates to user-stats.getDashboardStats', async () => {
    vi.mocked(userStats.getDashboardStats).mockResolvedValue({
      totalTasks: 5, completed: 2, inProgress: 3, notifications: 1,
    } as never);
    expect(await ctrl.myStats(USER)).toEqual({
      data: { totalTasks: 5, completed: 2, inProgress: 3, notifications: 1 },
    });
    expect(userStats.getDashboardStats).toHaveBeenCalledWith('u1');
  });
});
