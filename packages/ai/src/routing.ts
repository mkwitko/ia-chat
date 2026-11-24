import * as z from 'zod';
import { Provider, type Route } from './models.ts';

export const Task = {
  conversation: 'conversation',
  conversationEscalated: 'conversation_escalated',
  summarize: 'summarize',
  qualityReview: 'quality_review',
  insights: 'insights',
  transcribe: 'transcribe',
} as const;

export type Task = (typeof Task)[keyof typeof Task];
export type RouteTable = Record<Task, Route>;

export const AiProfile = { development: 'development', production: 'production' } as const;
export type AiProfile = (typeof AiProfile)[keyof typeof AiProfile];

// Candidates from spec 04; the final choice comes from the evaluation (E-07).
const HAIKU = { provider: Provider.anthropic, model: 'claude-haiku-5-5' };
const SONNET = { provider: Provider.anthropic, model: 'claude-sonnet-5-5' };
const LUNA = { provider: Provider.openai, model: 'gpt-6-luna' };
const TERRA = { provider: Provider.openai, model: 'gpt-6.1-terra' };
const WHISPER = { provider: Provider.groq, model: 'whisper-large-v3-turbo' };
const MINI_TRANSCRIBE = { provider: Provider.openai, model: 'gpt-4o-mini-transcribe' };

const PRODUCTION_ROUTES: RouteTable = {
  conversation: { primary: HAIKU, fallback: LUNA },
  conversation_escalated: { primary: SONNET, fallback: TERRA },
  summarize: { primary: HAIKU, fallback: LUNA },
  quality_review: { primary: SONNET },
  insights: { primary: SONNET },
  transcribe: { primary: WHISPER, fallback: MINI_TRANSCRIBE },
};

// Development: free Workers AI (account-wide quota). Never patient traffic.
const DEV_CHAT = {
  provider: Provider.workersAi,
  model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
};

const DEVELOPMENT_ROUTES: RouteTable = {
  conversation: { primary: DEV_CHAT },
  conversation_escalated: { primary: DEV_CHAT },
  summarize: { primary: DEV_CHAT },
  quality_review: { primary: DEV_CHAT },
  insights: { primary: DEV_CHAT },
  transcribe: { primary: WHISPER },
};

const modelRefSchema = z.object({ provider: z.enum(Provider), model: z.string().min(1) });
const routeSchema = z.object({ primary: modelRefSchema, fallback: modelRefSchema.optional() });
const overrideSchema = z.partialRecord(z.enum(Task), routeSchema);

/** Base table for the profile, with per-task overrides from AI_ROUTES (JSON), no deploy needed. */
export function routeTable(profile: AiProfile, overrideJson?: string): RouteTable {
  const base = profile === AiProfile.production ? PRODUCTION_ROUTES : DEVELOPMENT_ROUTES;
  if (!overrideJson) return base;
  const override = overrideSchema.parse(JSON.parse(overrideJson)) as Partial<RouteTable>;
  return { ...base, ...override };
}
