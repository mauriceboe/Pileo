import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const currentDir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(currentDir, '../../../.env') });

const envSchema = z.object({
  PILEO_PORT: z.coerce.number().int().positive().default(3000),
  PILEO_HOST: z.string().default('0.0.0.0'),
  PILEO_NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  PILEO_DB_PATH: z.string().default('./data/pileo.db'),

  PILEO_SESSION_SECRET: z.string().min(32, 'PILEO_SESSION_SECRET must be at least 32 characters'),
  PILEO_SESSION_MAX_AGE: z.coerce.number().int().positive().default(86400000), // 24h in ms

  PILEO_CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PILEO_TRUST_PROXY: z.coerce.boolean().default(false),

  PILEO_UPLOAD_DIR: z.string().default('./uploads'),
  PILEO_MAX_FILE_SIZE: z.coerce.number().int().positive().default(10485760), // 10MB

  PILEO_SMTP_HOST: z.string().optional(),
  PILEO_SMTP_PORT: z.coerce.number().int().positive().optional(),
  PILEO_SMTP_USER: z.string().optional(),
  PILEO_SMTP_PASSWORD: z.string().optional(),
  PILEO_SMTP_FROM: z.string().email().optional(),

  PILEO_LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  PILEO_RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(900000), // 15min
  PILEO_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    const errorMessage = `\n❌ Missing or invalid environment variables:\n${formatted}\n`;
    throw new Error(errorMessage);
  }

  return result.data;
}

export const env: Env = loadEnv();
