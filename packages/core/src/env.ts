import * as z from 'zod';

export const NodeEnv = {
  development: 'development',
  test: 'test',
  production: 'production',
} as const;

const INVALID_ENV = 'Invalid environment';
const POSTGRES_PROTOCOL = /^postgres(ql)?$/;

/** Variables every process needs. Apps extend it with their own. */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(NodeEnv).default(NodeEnv.development),
  DATABASE_URL: z.url({ protocol: POSTGRES_PROTOCOL }),
});

export type Env = z.infer<typeof baseEnvSchema>;

type EnvSource = Record<string, string | undefined>;

/** Validates the environment at startup. Error messages carry variable names, never values. */
export function parseEnvWith<S extends z.ZodType>(schema: S, source: EnvSource): z.output<S> {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`${INVALID_ENV}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function parseEnv(source: EnvSource): Env {
  return parseEnvWith(baseEnvSchema, source);
}
