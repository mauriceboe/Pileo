import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/member.service.js', () => ({
  listMembers: vi.fn(),
  addMember: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
}));

import * as memberService from '../../services/member.service.js';
import { MembersController } from './members.controller.js';

const USER = { id: 'u1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('MembersController', () => {
  const ctrl = new MembersController();

  it('list forwards (projectId, userId)', async () => {
    vi.mocked(memberService.listMembers).mockResolvedValue([{ userId: 'u1' }] as never);
    expect(await ctrl.list('p1', USER)).toEqual({ data: [{ userId: 'u1' }] });
    expect(memberService.listMembers).toHaveBeenCalledWith('p1', 'u1');
  });

  it('add forwards (projectId, callerId, email, role)', async () => {
    vi.mocked(memberService.addMember).mockResolvedValue({ userId: 'u2' } as never);
    await ctrl.add('p1', { email: 'b@x.de', role: 'member' }, USER);
    expect(memberService.addMember).toHaveBeenCalledWith('p1', 'u1', 'b@x.de', 'member');
  });

  it('updateRole forwards (projectId, callerId, memberUserId, role)', async () => {
    vi.mocked(memberService.updateMemberRole).mockResolvedValue({ role: 'admin' } as never);
    await ctrl.updateRole('p1', 'u2', { role: 'admin' }, USER);
    expect(memberService.updateMemberRole).toHaveBeenCalledWith('p1', 'u1', 'u2', 'admin');
  });

  it('remove forwards (projectId, callerId, memberUserId) and returns void', async () => {
    vi.mocked(memberService.removeMember).mockResolvedValue(undefined as never);
    expect(await ctrl.remove('p1', 'u2', USER)).toBeUndefined();
    expect(memberService.removeMember).toHaveBeenCalledWith('p1', 'u1', 'u2');
  });
});
