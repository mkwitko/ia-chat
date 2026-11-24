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

// Candidates from spec 04, ids from the Vercel AI Gateway catalog (24/11/2026).
// The final choice comes from the evaluation (E-07).
const HAIKU = { provider: Provider.anthropic, model: 'claude-haiku-5.5' };
const SONNET = { provider: Provider.anthropic, model: 'claude-sonnet-5.5' };
const LUNA = { provider: Provider.openai, model: 'gpt-6-luna' };
const TERRA = { provider: Provider.openai, model: 'gpt-6.1-terra' };
const TRANSCRIBE = { provider: Provider.openai, model: 'gpt-transcribe' };

export const DEFAULT_ROUTES: RouteTable = {
  conversation: { primary: HAIKU, fallback: LUNA },
  conversation_escalated: { primary: SONNET, fallback: TERRA },
  summarize: { primary: HAIKU, fallback: LUNA },
  quality_review: { primary: SONNET },
  insights: { primary: SONNET },
  transcribe: { primary: TRANSCRIBE },
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
