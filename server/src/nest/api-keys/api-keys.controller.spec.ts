import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/api-key.service.js', () => ({
  list: vi.fn(),
  create: vi.fn(),
  revoke: vi.fn(),
}));

import * as apiKeyService from '../../services/api-key.service.js';
import { ApiKeysController, ProjectApiKeysController } from './api-keys.controller.js';
import { ValidationError } from '../../utils/errors.js';

const USER = { id: 'u1' } as never;

beforeEach(() => vi.clearAllMocks());

describe('ProjectApiKeysController', () => {
  const ctrl = new ProjectApiKeysController();

  it('list forwards (projectId, userId)', async () => {
    vi.mocked(apiKeyService.list).mockResolvedValue([{ id: 'k1' }] as never);
    expect(await ctrl.list('p1', USER)).toEqual({ data: [{ id: 'k1' }] });
    expect(apiKeyService.list).toHaveBeenCalledWith('p1', 'u1');
  });

  it('create trims name and forwards to service', async () => {
    vi.mocked(apiKeyService.create).mockResolvedValue({ key: { id: 'k1' }, rawKey: 'pil_abc' } as never);
    await ctrl.create('p1', { name: '  n8n  ' }, USER);
    expect(apiKeyService.create).toHaveBeenCalledWith('p1', 'u1', 'n8n');
  });

  it('create rejects missing name with the exact legacy message', async () => {
    await expect(ctrl.create('p1', {}, USER))
      .rejects.toEqual(new ValidationError('Name is required (max 100 characters)'));
  });

  it('create rejects whitespace-only name', async () => {
    await expect(ctrl.create('p1', { name: '   ' }, USER))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('create rejects name > 100 chars', async () => {
    await expect(ctrl.create('p1', { name: 'x'.repeat(101) }, USER))
      .rejects.toBeInstanceOf(ValidationError);
  });
});

describe('ApiKeysController', () => {
  it('revoke forwards (keyId, userId)', async () => {
    vi.mocked(apiKeyService.revoke).mockResolvedValue(undefined as never);
    expect(await new ApiKeysController().revoke('k1', USER)).toBeUndefined();
    expect(apiKeyService.revoke).toHaveBeenCalledWith('k1', 'u1');
  });
});
