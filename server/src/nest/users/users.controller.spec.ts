import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/user.service.js', () => ({
  getById: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  updateAvatar: vi.fn(),
}));

// /me/tasks and /me/stats touch drizzle directly. We mock the whole config
// module so the controller doesn't try to open a real DB during tests.
vi.mock('../../config/database.js', () => ({
  db: { select: vi.fn() },
  sqlite: undefined,
}));

import * as userService from '../../services/user.service.js';
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
});
