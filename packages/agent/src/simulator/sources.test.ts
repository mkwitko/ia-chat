import { Identity, type AgentProfile } from '@app/ai';
import { describe, expect, it } from 'vitest';
import { sourcesOf, SourceKind } from './sources.ts';

const profile: AgentProfile = {
  identity: Identity.assistant,
  assistantName: 'Lia',
  professionalName: 'Dr. Exemplo',
  specialty: undefined,
  tone: undefined,
  examples: [],
  services: [{ id: 's1', name: 'Avaliação', minutes: 60, priceCents: 18_000 }],
  pricesForbidden: false,
  hours: [],
  cancellationRule: undefined,
  address: 'Rua das Flores, 100',
  arrival: undefined,
  knowledge: [{ question: 'Estacionamento?', answer: 'Há vagas gratuitas na rua em frente.' }],
};
const none = { messages: [] };

describe('sourcesOf', () => {
  it('finds the catalog, address and knowledge facts the answer repeats', () => {
    const text = 'A avaliação é R$ 180. Fica na Rua das Flores e tem vagas gratuitas em frente.';
    expect(sourcesOf({ text, ...none }, profile).map((source) => source.kind)).toEqual([
      SourceKind.service,
      SourceKind.address,
      SourceKind.knowledge,
    ]);
  });

  it('does not take R$ 18 for R$ 180 and ignores unrelated answers', () => {
    expect(sourcesOf({ text: 'Fica R$ 18.', ...none }, profile)).toEqual([]);
    expect(sourcesOf({ text: 'Oi, tudo bem?', ...none }, profile)).toEqual([]);
  });

  it('lists the tool calls from the messages, not from the text', () => {
    const messages = [
      {
        role: 'assistant' as const,
        content: [
          {
            type: 'tool-call' as const,
            toolCallId: '1',
            toolName: 'consultar_horarios',
            input: { servico: 'Avaliação' },
          },
          {
            type: 'tool-call' as const,
            toolCallId: '2',
            toolName: 'ferramenta_desconhecida',
            input: {},
          },
        ],
      },
    ];
    expect(sourcesOf({ text: 'Oi', messages }, profile)).toEqual([
      expect.objectContaining({ kind: SourceKind.tool, detail: 'Avaliação' }),
    ]);
  });
});
