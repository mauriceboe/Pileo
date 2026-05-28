import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from './zod.pipe.js';
import { ValidationError } from '../../utils/errors.js';

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().nonnegative(),
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(schema);
  const meta = { type: 'body' as const, metatype: undefined, data: undefined };

  it('returns the parsed value on success', () => {
    const out = pipe.transform({ email: 'm@x.de', age: 30 }, meta);
    expect(out).toEqual({ email: 'm@x.de', age: 30 });
  });

  it('strips unknown keys per zod default behaviour', () => {
    const out = pipe.transform({ email: 'm@x.de', age: 30, extra: 'x' } as never, meta);
    expect(out).not.toHaveProperty('extra');
  });

  it('throws ValidationError with details matching legacy middleware shape', () => {
    try {
      pipe.transform({ email: 'not-an-email', age: -1 }, meta);
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      const ve = err as ValidationError;
      expect(ve.statusCode).toBe(400);
      expect(ve.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(ve.details)).toBe(true);
      const details = ve.details as Array<{ path: string; message: string }>;
      expect(details.some((d) => d.path === 'email')).toBe(true);
      expect(details.some((d) => d.path === 'age')).toBe(true);
    }
  });

  it('joins nested paths with dots (matches legacy validate.middleware)', () => {
    const nested = z.object({ user: z.object({ email: z.string().email() }) });
    const p = new ZodValidationPipe(nested);
    try {
      p.transform({ user: { email: 'x' } }, meta);
      throw new Error('expected throw');
    } catch (err) {
      const details = (err as ValidationError).details as Array<{ path: string }>;
      expect(details[0]!.path).toBe('user.email');
    }
  });
});
