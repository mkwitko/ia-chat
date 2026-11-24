import { createAnthropic } from '@ai-sdk/anthropic';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel, TranscriptionModel } from 'ai';
import type { AiEnv } from './env.ts';
import { Provider, type ModelRef } from './models.ts';

export interface ModelResolver {
  language(ref: ModelRef): LanguageModel;
  transcription(ref: ModelRef): TranscriptionModel;
}

const WORKERS_AI_NAME = 'workers-ai';
const workersAiUrl = (accountId: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;

export class MissingCredentialError extends Error {
  constructor(provider: string) {
    super(`No API key configured for ${provider}`);
  }
}

function required(value: string | undefined, provider: string): string {
  if (!value) throw new MissingCredentialError(provider);
  return value;
}

/** Builds models from the keys in the environment; a missing key fails only when that model is used. */
export function envModelResolver(env: AiEnv): ModelResolver {
  return {
    language({ provider, model }) {
      switch (provider) {
        case Provider.anthropic:
          return createAnthropic({ apiKey: required(env.ANTHROPIC_API_KEY, provider) })(model);
        case Provider.openai:
          return createOpenAI({ apiKey: required(env.OPENAI_API_KEY, provider) })(model);
        case Provider.groq:
          return createGroq({ apiKey: required(env.GROQ_API_KEY, provider) })(model);
        case Provider.workersAi:
          return createOpenAICompatible({
            name: WORKERS_AI_NAME,
            baseURL: workersAiUrl(required(env.CLOUDFLARE_ACCOUNT_ID, provider)),
            apiKey: required(env.CLOUDFLARE_API_TOKEN, provider),
          })(model);
      }
    },
    transcription({ provider, model }) {
      if (provider === Provider.groq) {
        return createGroq({ apiKey: required(env.GROQ_API_KEY, provider) }).transcription(model);
      }
      return createOpenAI({ apiKey: required(env.OPENAI_API_KEY, provider) }).transcription(model);
    },
  };
}
