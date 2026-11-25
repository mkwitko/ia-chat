import { Identity } from '@app/ai';
import { AgentCopy } from './copy.ts';
import type { AgentInput } from './input.ts';

// Spec 04, "Identificação": the first answer of a conversation always introduces the assistant.

type Introduced = Pick<AgentInput, 'profile' | 'state'>;

// The model already introduced itself when the answer holds the mode's key words.
const INTRO_MARKER: Readonly<Record<Identity, string>> = {
  [Identity.assistant]: 'assistente virtual',
  [Identity.clinic]: 'consultório de',
  [Identity.professional]: '',
};
// The intro already greets: drop the model's own "Oi!" or "Olá," at the start.
const LEADING_GREETING = /^(?:oi|olá|ola|bom dia|boa tarde|boa noite)[!,.]?\s*/i;

export function identified(text: string, input: Introduced): string {
  const intro = AgentCopy.identification(input.profile);
  if (
    !input.state.firstMessage ||
    !intro ||
    text.toLowerCase().includes(INTRO_MARKER[input.profile.identity])
  )
    return text;
  return `${intro} ${text.replace(LEADING_GREETING, '')}`;
}

/** Fixed answers keep their message first (SAMU before anything) and introduce after. */
export function introducedAfter(text: string, input: Introduced): string {
  const intro = AgentCopy.identification(input.profile);
  if (!input.state.firstMessage || !intro) return text;
  return `${text} ${intro.replace(LEADING_GREETING, '')}`;
}
