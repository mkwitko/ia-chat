import { Provider, type ModelRef } from '../src/models.ts';

// Conversation candidates (spec 04). Gemini 3.8 Flash and GPT-6.2 Sol added by the owner
// on 24/11/2026; the escalation tier runs the same battery.
export const CANDIDATES: Readonly<Record<string, ModelRef>> = {
  haiku: { provider: Provider.anthropic, model: 'claude-haiku-5.5' },
  luna: { provider: Provider.openai, model: 'gpt-6-luna' },
  gemini: { provider: Provider.google, model: 'gemini-3.8-flash' },
  sonnet: { provider: Provider.anthropic, model: 'claude-sonnet-5.5' },
  terra: { provider: Provider.openai, model: 'gpt-6.1-terra' },
  sol: { provider: Provider.openai, model: 'gpt-6.2-sol' },
};
