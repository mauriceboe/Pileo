import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/custom-field.service.js', () => ({
  listFields: vi.fn(),
  createField: vi.fn(),
  updateField: vi.fn(),
  deleteField: vi.fn(),
  reorderFields: vi.fn(),
  getTaskValues: vi.fn(),
  setTaskValue: vi.fn(),
  deleteTaskValue: vi.fn(),
}));

import * as svc from '../../services/custom-field.service.js';
import {
  CustomFieldsController,
  ProjectCustomFieldsController,
  TaskCustomValuesController,
} from './custom-fields.controller.js';
import { AppError, ValidationError } from '../../utils/errors.js';

beforeEach(() => vi.clearAllMocks());

describe('ProjectCustomFieldsController', () => {
  const ctrl = new ProjectCustomFieldsController();

  it('list wraps service result in { data }', () => {
    vi.mocked(svc.listFields).mockReturnValue([{ id: 'f1' }] as never);
    expect(ctrl.list('p1')).toEqual({ data: [{ id: 'f1' }] });
    expect(svc.listFields).toHaveBeenCalledWith('p1');
  });

  it('create accepts a dropdown with options', () => {
    vi.mocked(svc.createField).mockReturnValue({ id: 'f1' } as never);
    const result = ctrl.create('p1', { name: 'Severity', type: 'dropdown', options: ['low', 'high'], showOnCard: true });
    expect(svc.createField).toHaveBeenCalledWith('p1', {
      name: 'Severity', type: 'dropdown', options: ['low', 'high'], showOnCard: true,
    });
    expect(result).toEqual({ data: { id: 'f1' } });
  });

  it('create rejects missing name with the exact legacy message', () => {
    expect(() => ctrl.create('p1', { type: 'text_small' } as never))
      .toThrow(new ValidationError('name and type are required'));
  });

  it('create rejects an unknown type with the same message (matches legacy combined check)', () => {
    expect(() => ctrl.create('p1', { name: 'X', type: 'nope' } as never))
      .toThrow(new ValidationError('name and type are required'));
  });

  it('reorder requires an array of ids', () => {
    expect(() => ctrl.reorder('p1', { fieldIds: 'no' } as never))
      .toThrow(new ValidationError('fieldIds array required'));
  });

  it('reorder returns the legacy "Reordered" message and forwards filtered ids', () => {
    const result = ctrl.reorder('p1', { fieldIds: ['a', 1 as never, 'b'] });
    expect(svc.reorderFields).toHaveBeenCalledWith('p1', ['a', 'b']);
    expect(result).toEqual({ data: { message: 'Reordered' } });
  });
});

describe('CustomFieldsController', () => {
  const ctrl = new CustomFieldsController();

  it('update forwards an isEnabled flip', () => {
    vi.mocked(svc.updateField).mockReturnValue({ id: 'f1', isEnabled: false } as never);
    ctrl.update('f1', { isEnabled: false });
    expect(svc.updateField).toHaveBeenCalledWith('f1', { isEnabled: false });
  });

  it('update strips unknown / wrong-typed keys before delegating', () => {
    vi.mocked(svc.updateField).mockReturnValue({ id: 'f1' } as never);
    ctrl.update('f1', { name: 'NewName', type: 'invalid' as never, options: 'no' as never, showOnCard: 'yes' as never });
    expect(svc.updateField).toHaveBeenCalledWith('f1', { name: 'NewName' });
  });

  it('update translates a plain service throw into 404 NOT_FOUND with legacy message', () => {
    vi.mocked(svc.updateField).mockImplementation(() => { throw new Error('Field not found'); });
    try {
      ctrl.update('missing', { name: 'X' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const ae = err as AppError;
      expect(ae.statusCode).toBe(404);
      expect(ae.code).toBe('NOT_FOUND');
      expect(ae.message).toBe('Field not found');
    }
  });

  it('remove delegates and returns nothing (204 by decorator)', () => {
    expect(ctrl.remove('f1')).toBeUndefined();
    expect(svc.deleteField).toHaveBeenCalledWith('f1');
  });
});

describe('TaskCustomValuesController', () => {
  const ctrl = new TaskCustomValuesController();

  it('list returns wrapped values', () => {
    vi.mocked(svc.getTaskValues).mockReturnValue([{ id: 'v1' }] as never);
    expect(ctrl.list('t1')).toEqual({ data: [{ id: 'v1' }] });
  });

  it('set rejects non-string value with the legacy message', () => {
    expect(() => ctrl.set('t1', 'f1', { value: 123 } as never))
      .toThrow(new ValidationError('value is required'));
  });

  it('set forwards (taskId, fieldId, value)', () => {
    vi.mocked(svc.setTaskValue).mockReturnValue({ id: 'v1' } as never);
    ctrl.set('t1', 'f1', { value: 'hello' });
    expect(svc.setTaskValue).toHaveBeenCalledWith('t1', 'f1', 'hello');
  });

  it('delete forwards (taskId, fieldId) and returns 204', () => {
    expect(ctrl.remove('t1', 'f1')).toBeUndefined();
    expect(svc.deleteTaskValue).toHaveBeenCalledWith('t1', 'f1');
  });
});
