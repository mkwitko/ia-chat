import * as z from 'zod';

export const NodeEnv = {
  development: 'development',
  test: 'test',
  production: 'production',
} as const;

const INVALID_ENV = 'Invalid environment';
const POSTGRES_PROTOCOL = /^postgres(ql)?$/;

/** Optional text: unset or empty (a blank line in .env) both mean "off". */
const optionalText = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed?.length ? trimmed : undefined;
  });

/** Observability switches (E-26): each integration lights up only when its variable is set. */
export const observabilityEnvSchema = z.object({
  /** Sentry errors for api and worker. Off when empty. */
  SENTRY_DSN: optionalText,
  /** Release tag on errors (a commit SHA). */
  APP_RELEASE: optionalText,
  /** Axiom log shipping needs both; otherwise logs go to stdout only. */
  AXIOM_TOKEN: optionalText,
  AXIOM_DATASET: optionalText,
  LOG_LEVEL: optionalText,
  /** Worker readiness endpoint (GET /ready). Off when empty. */
  WORKER_HEALTH_PORT: optionalText
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .pipe(z.number().int().positive().optional()),
});

/** Variables every process needs. Apps extend it with their own. */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(NodeEnv).default(NodeEnv.development),
  DATABASE_URL: z.url({ protocol: POSTGRES_PROTOCOL }),
  ...observabilityEnvSchema.shape,
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
