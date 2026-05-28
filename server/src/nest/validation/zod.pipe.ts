import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../../utils/errors.js';

// Validates an incoming body / query / param object against a Zod schema
// and returns the parsed value. On failure, throws the legacy
// ValidationError with the same details shape as validate.middleware.ts so
// the wire response stays identical across Nest and Express controllers.
//
// Usage: @Body(new ZodValidationPipe(loginSchema)) body: LoginInput
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Validation failed', details);
    }
    return result.data;
  }
}
