import * as z from 'zod';

const optionalKey = z.string().min(1).optional();

/** AI credentials (.env, never the repository). */
export const aiEnvSchema = z.object({
  /** Vercel AI Gateway key: one key for every model provider. */
  VERCEL_API_KEY: optionalKey,
  /** Jev (TypeSafe), outside the gateway. */
  TYPESAFE_API_KEY: optionalKey,
  /** Optional JSON with per-task route overrides. */
  AI_ROUTES: z.string().optional(),
});

export type AiEnv = z.infer<typeof aiEnvSchema>;
