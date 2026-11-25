import { Sensitivity } from '@app/core';
import { describe, expect, it } from 'vitest';
import { conversationBlocks, Identity, type AgentProfile, type AgentState } from './prompt.ts';

const profile = (
  identity: Identity,
  sensitivity: Sensitivity = Sensitivity.health,
): AgentProfile => ({
  identity,
  sensitivity,
  vocabulary: 'paciente',
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
const text = (identity: Identity, sensitivity?: Sensitivity) =>
  conversationBlocks(profile(identity, sensitivity), state)
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

describe('segment sensitivity (M-02)', () => {
  const EMERGENCY = 'SAMU 192';
  const NO_CLINICAL_ADVICE = 'Não dê orientação clínica';
  const HEALTH_ROLE = 'profissional de saúde';

  it('a segment without health answers without clinical or emergency rules', () => {
    const prompt = text(Identity.assistant, Sensitivity.none);
    for (const health of [EMERGENCY, NO_CLINICAL_ADVICE, HEALTH_ROLE])
      expect(prompt).not.toContain(health);
  });

  it('a health segment keeps emergency and no clinical advice', () => {
    const prompt = text(Identity.assistant, Sensitivity.health);
    for (const health of [EMERGENCY, NO_CLINICAL_ADVICE, HEALTH_ROLE])
      expect(prompt).toContain(health);
  });

  it('names who is served with the template vocabulary', () => {
    expect(text(Identity.assistant)).toContain('Chame quem é atendido de "paciente"');
  });
});
