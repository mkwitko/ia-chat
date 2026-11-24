import { createGroq } from '@ai-sdk/groq';
import { createGateway, type LanguageModel, type TranscriptionModel } from 'ai';
import type { AiEnv } from './env.ts';
import { modelKey, Provider, type ModelRef } from './models.ts';

export interface ModelResolver {
  language(ref: ModelRef): LanguageModel;
  transcription(ref: ModelRef): TranscriptionModel;
}

export class MissingCredentialError extends Error {
  constructor(name: string) {
    super(`${name} is not configured`);
  }
}

const GATEWAY_KEY = 'VERCEL_API_KEY';
const GROQ_KEY = 'GROQ_API_KEY';
const DEV_IN_PRODUCTION = 'AI_DEV_PROVIDER is for development only; remove it in production';

/** Ask the gateway to route only to providers that do not retain prompts (spec 04, privacy). */
export const NO_RETENTION = { zeroDataRetention: true } as const;

/** Every model goes through the Vercel AI Gateway with a single key (spec 04). */
export function gatewayModelResolver(env: AiEnv): ModelResolver {
  if (!env.VERCEL_API_KEY) throw new MissingCredentialError(GATEWAY_KEY);
  const gateway = createGateway({ apiKey: env.VERCEL_API_KEY });
  return {
    language: (ref) => gateway(modelKey(ref)),
    transcription: (ref) => gateway.transcriptionModel(modelKey(ref)),
  };
}

/**
 * Development: Groq models go straight to Groq (free tier); anything else still uses the
 * Vercel gateway, created only if a route asks for it.
 */
export function devModelResolver(env: AiEnv, production: boolean): ModelResolver {
  if (production) throw new Error(DEV_IN_PRODUCTION);
  if (!env.GROQ_API_KEY) throw new MissingCredentialError(GROQ_KEY);
  const groq = createGroq({ apiKey: env.GROQ_API_KEY });
  const gateway = () => gatewayModelResolver(env);
  return {
    language: (ref) => (ref.provider === Provider.groq ? groq(ref.model) : gateway().language(ref)),
    transcription: (ref) =>
      ref.provider === Provider.groq ? groq.transcription(ref.model) : gateway().transcription(ref),
  };
}
