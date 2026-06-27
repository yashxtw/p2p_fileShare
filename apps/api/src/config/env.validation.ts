import { z } from 'zod';
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  NEON_DATABASE_URL: z.string().min(1, 'NEON_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});
export type EnvConfig = z.infer<typeof envSchema>;
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.errors
      .map((err) => `  • ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    throw new Error(
      `\n❌ Environment validation failed:\n${errors}\n\nPlease check your .env file against .env.example\n`,
    );
  }
  return result.data;
}
