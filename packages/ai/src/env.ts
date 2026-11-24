import * as z from 'zod';
import { AiProfile } from './routing.ts';

const optionalKey = z.string().min(1).optional();

/** Provider credentials (.env, never the repository). Each is needed only if a route uses it. */
export const aiEnvSchema = z.object({
  AI_PROFILE: z.enum(AiProfile).default(AiProfile.development),
  /** Optional JSON with per-task route overrides. */
  AI_ROUTES: z.string().optional(),
  ANTHROPIC_API_KEY: optionalKey,
  OPENAI_API_KEY: optionalKey,
  GROQ_API_KEY: optionalKey,
  CLOUDFLARE_ACCOUNT_ID: optionalKey,
  CLOUDFLARE_API_TOKEN: optionalKey,
  TYPESAFE_API_KEY: optionalKey,
});

export type AiEnv = z.infer<typeof aiEnvSchema>;
