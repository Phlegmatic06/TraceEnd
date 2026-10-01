// ──────────────────────────────────────────────────────────────
// TraceEnd — Environment Configuration
// Validates required env vars at startup. Fails fast on misconfiguration.
// ──────────────────────────────────────────────────────────────

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  AUTH_SECRET: z.string().optional(),
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `\n❌ Invalid environment configuration:\n${formatted}\n\nCopy .env.example to .env and fill in the required values.\n`
    );
  }

  return parsed.data;
}

export const env = validateEnv();
