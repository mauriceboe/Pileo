import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/notification.service.js', () => ({
  list: vi.fn(),
  getUnreadCount: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));

import * as notificationService from '../../services/notification.service.js';
import { NotificationsController } from './notifications.controller.js';

const USER = { id: 'u1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('NotificationsController', () => {
  const ctrl = new NotificationsController();

  it('list returns {data, unreadCount} — NOT just {data} — to match legacy', async () => {
    vi.mocked(notificationService.list).mockResolvedValue([{ id: 'n1' }] as never);
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(3 as never);
    const result = await ctrl.list(USER);
    expect(result).toEqual({ data: [{ id: 'n1' }], unreadCount: 3 });
  });

  it('list queries list + unreadCount in parallel', async () => {
    vi.mocked(notificationService.list).mockResolvedValue([] as never);
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0 as never);
    await ctrl.list(USER);
    expect(notificationService.list).toHaveBeenCalledWith('u1');
    expect(notificationService.getUnreadCount).toHaveBeenCalledWith('u1');
  });

  it('markRead forwards (id, userId) and wraps result', async () => {
    vi.mocked(notificationService.markRead).mockResolvedValue({ id: 'n1', read: true } as never);
    expect(await ctrl.markRead('n1', USER)).toEqual({ data: { id: 'n1', read: true } });
    expect(notificationService.markRead).toHaveBeenCalledWith('n1', 'u1');
  });

  it('markAllRead delegates and returns void (204 by decorator)', async () => {
    vi.mocked(notificationService.markAllRead).mockResolvedValue(undefined as never);
    expect(await ctrl.markAllRead(USER)).toBeUndefined();
    expect(notificationService.markAllRead).toHaveBeenCalledWith('u1');
  });
});
