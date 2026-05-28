import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/admin.service.js', () => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  updateRole: vi.fn(),
}));
vi.mock('../../services/settings.service.js', () => ({
  isRegistrationEnabled: vi.fn(),
  setSetting: vi.fn(),
}));

import * as adminService from '../../services/admin.service.js';
import * as settingsService from '../../services/settings.service.js';
import { AdminController } from './admin.controller.js';

const ADMIN = { id: 'admin-1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('AdminController', () => {
  const ctrl = new AdminController();

  it('listUsers wraps service result', async () => {
    vi.mocked(adminService.listUsers).mockResolvedValue([{ id: 'u1' }] as never);
    expect(await ctrl.listUsers()).toEqual({ data: [{ id: 'u1' }] });
  });

  it('createUser forwards body', async () => {
    vi.mocked(adminService.createUser).mockResolvedValue({ id: 'u1' } as never);
    await ctrl.createUser({ email: 'x@x.de', username: 'x', password: 'pw' } as never);
    expect(adminService.createUser).toHaveBeenCalledWith({ email: 'x@x.de', username: 'x', password: 'pw' });
  });

  it('deleteUser forwards (targetId, callerId)', async () => {
    vi.mocked(adminService.deleteUser).mockResolvedValue(undefined as never);
    expect(await ctrl.deleteUser('u2', ADMIN)).toBeUndefined();
    expect(adminService.deleteUser).toHaveBeenCalledWith('u2', 'admin-1');
  });

  it('updateRole forwards (targetId, callerId, body)', async () => {
    vi.mocked(adminService.updateRole).mockResolvedValue({ id: 'u2' } as never);
    await ctrl.updateRole('u2', { role: 'admin' } as never, ADMIN);
    expect(adminService.updateRole).toHaveBeenCalledWith('u2', 'admin-1', { role: 'admin' });
  });

  it('getSettings exposes registrationEnabled', () => {
    vi.mocked(settingsService.isRegistrationEnabled).mockReturnValue(true);
    expect(ctrl.getSettings()).toEqual({ data: { registrationEnabled: true } });
  });

  it('updateSettings persists a boolean change', () => {
    vi.mocked(settingsService.isRegistrationEnabled).mockReturnValue(false);
    ctrl.updateSettings({ registrationEnabled: false });
    expect(settingsService.setSetting).toHaveBeenCalledWith('registration_enabled', 'false');
  });

  it('updateSettings silently ignores non-boolean values (matches legacy)', () => {
    vi.mocked(settingsService.isRegistrationEnabled).mockReturnValue(true);
    ctrl.updateSettings({ registrationEnabled: 'yes' as never });
    expect(settingsService.setSetting).not.toHaveBeenCalled();
  });

  it('updateSettings tolerates an empty body and still returns current state', () => {
    vi.mocked(settingsService.isRegistrationEnabled).mockReturnValue(true);
    expect(ctrl.updateSettings({})).toEqual({ data: { registrationEnabled: true } });
  });
});
