import * as z from 'zod';
import { Provider, type Route } from './models.ts';

export const Task = {
  conversation: 'conversation',
  conversationEscalated: 'conversation_escalated',
  summarize: 'summarize',
  qualityReview: 'quality_review',
  insights: 'insights',
  transcribe: 'transcribe',
  /** Onboarding: business facts from a public page the owner pointed to (spec 09). */
  prefill: 'prefill',
  /** Painel: draft of an answer to a question the assistant could not answer (spec 04, 10). */
  faqSuggest: 'faq_suggest',
} as const;

export type Task = (typeof Task)[keyof typeof Task];
export type RouteTable = Record<Task, Route>;

// Provisional choice from the E-07 battery of 24/11/2026 (spec 04, "Resultado da avaliação"):
// fallbacks on another provider, so an OpenAI outage does not stop the service. The
// conversation fallback is Haiku (same price as Luna) by the owner's choice: an outage does
// not multiply the bill; the model-independent guards cover its weaker safety score.
// Confirm with the final run (each case twice) when the gateway has credit.
const HAIKU = { provider: Provider.anthropic, model: 'claude-haiku-5.5' };
const SONNET = { provider: Provider.anthropic, model: 'claude-sonnet-5.5' };
const LUNA = { provider: Provider.openai, model: 'gpt-6-luna' };
const TERRA = { provider: Provider.openai, model: 'gpt-6.1-terra' };
const SOL = { provider: Provider.openai, model: 'gpt-6.2-sol' };
const TRANSCRIBE = { provider: Provider.openai, model: 'gpt-transcribe' };

export const DEFAULT_ROUTES: RouteTable = {
  conversation: { primary: LUNA, fallback: HAIKU },
  conversation_escalated: { primary: TERRA, fallback: SONNET },
  summarize: { primary: LUNA, fallback: HAIKU },
  quality_review: { primary: SOL, fallback: SONNET },
  insights: { primary: SOL, fallback: SONNET },
  transcribe: { primary: TRANSCRIBE },
  prefill: { primary: LUNA, fallback: HAIKU },
  faq_suggest: { primary: LUNA, fallback: HAIKU },
};

// AI_DEV_PROVIDER=groq: free models to try the whole flow locally. Not for choosing models
// nor for the evaluation battery, which always runs the production candidates.
const GROQ_LARGE = { provider: Provider.groq, model: 'openai/gpt-oss-120b' };
const GROQ_SMALL = { provider: Provider.groq, model: 'openai/gpt-oss-20b' };
export const GROQ_DEV_ROUTES: RouteTable = {
  conversation: { primary: GROQ_LARGE },
  conversation_escalated: { primary: GROQ_LARGE },
  summarize: { primary: GROQ_SMALL },
  quality_review: { primary: GROQ_LARGE },
  insights: { primary: GROQ_LARGE },
  transcribe: { primary: { provider: Provider.groq, model: 'whisper-large-v3-turbo' } },
  prefill: { primary: GROQ_LARGE },
  faq_suggest: { primary: GROQ_LARGE },
};

const modelRefSchema = z.object({ provider: z.enum(Provider), model: z.string().min(1) });
const routeSchema = z.object({ primary: modelRefSchema, fallback: modelRefSchema.optional() });
const overrideSchema = z.partialRecord(z.enum(Task), routeSchema);

/** Default table with per-task overrides from AI_ROUTES (JSON): a restart, no deploy. */
export function routeTable(overrideJson?: string): RouteTable {
  if (!overrideJson) return DEFAULT_ROUTES;
  const override = overrideSchema.parse(JSON.parse(overrideJson)) as Partial<RouteTable>;
  return { ...DEFAULT_ROUTES, ...override };
}
