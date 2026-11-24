import { createGateway, type LanguageModel, type TranscriptionModel } from 'ai';
import type { AiEnv } from './env.ts';
import { modelKey, type ModelRef } from './models.ts';

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
