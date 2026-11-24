import { describe, expect, it } from 'vitest';
import { conversationBlocks, Identity, type AgentProfile, type AgentState } from './prompt.ts';

const profile = (identity: Identity): AgentProfile => ({
  identity,
  assistantName: 'Lia',
  professionalName: 'Dr. Rafael Exemplo',
  specialty: undefined,
  tone: undefined,
  examples: [],
  services: [],
  pricesForbidden: false,
  hours: [],
  cancellationRule: undefined,
  address: undefined,
  arrival: undefined,
  knowledge: [],
});
const state: AgentState = {
  now: 'segunda',
  contactName: undefined,
  appointments: [],
  done: [],
  firstMessage: true,
  summary: undefined,
};
const text = (identity: Identity) =>
  conversationBlocks(profile(identity), state)
    .map((block) => block.text)
    .join('\n');

describe('identity modes (owner decision, 24/11/2026)', () => {
  it('assistant: introduces itself as the virtual assistant on the first answer', () => {
    expect(text(Identity.assistant)).toContain(
      'apresentando como Lia, assistente virtual do consultório de Dr. Rafael Exemplo',
    );
  });

  it('clinic: speaks as the front desk without announcing AI', () => {
    const prompt = text(Identity.clinic);
    expect(prompt).toContain('Fale como a recepção do consultório de Dr. Rafael Exemplo');
    expect(prompt).not.toContain('apresentando como Lia');
  });

  it('professional: answers in the first person as the professional', () => {
    expect(text(Identity.professional)).toContain(
      'Responda em nome de Dr. Rafael Exemplo, em primeira pessoa',
    );
  });

  it('every mode tells the truth when asked directly', () => {
    for (const identity of Object.values(Identity))
      expect(text(identity)).toContain('diga a verdade');
  });
});
