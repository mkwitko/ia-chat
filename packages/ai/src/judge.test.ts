import { describe, expect, it } from 'vitest';
import { judge, type JudgeProvider } from './judge.ts';

const questions = {
  urgent: { kind: 'noul', instructions: 'O paciente descreve uma emergência?' },
  intent: {
    kind: 'choice',
    instructions: 'O que o paciente quer?',
    options: { schedule: 'Marcar horário', price: 'Saber preço', other: 'Outra coisa' },
  },
} as const;

const answering: JudgeProvider = {
  ask: () =>
    Promise.resolve({
      answers: {
        urgent: { kind: 'noul', probability: 0.02 },
        intent: { kind: 'choice', choice: 'price', confidence: 0.9 },
      },
      usage: { inputTokens: 120, outputTokens: 0 },
    }),
};

describe('judge', () => {
  it('returns typed answers from the provider', async () => {
    const result = await judge(answering, { state: { text: 'quanto custa?' }, questions });
    expect(result.answers.urgent).toEqual({ kind: 'noul', probability: 0.02 });
    expect(result.answers.intent).toMatchObject({ choice: 'price' });
  });

  it('returns null per question when the provider fails, without throwing', async () => {
    const failing: JudgeProvider = { ask: () => Promise.reject(new Error('down')) };
    const result = await judge(failing, { state: {}, questions });
    expect(result.answers).toEqual({ urgent: null, intent: null });
  });

  it('returns null when the provider is slower than the timeout', async () => {
    const slow: JudgeProvider = { ask: () => new Promise(() => undefined) };
    const result = await judge(slow, { state: {}, questions, timeoutMs: 20 });
    expect(result.answers).toEqual({ urgent: null, intent: null });
  });

  it('returns null for a question the provider left out', async () => {
    const partial: JudgeProvider = {
      ask: () =>
        Promise.resolve({
          answers: { urgent: { kind: 'noul', probability: 0.5 } },
          usage: { inputTokens: 10, outputTokens: 0 },
        }),
    };
    const result = await judge(partial, { state: {}, questions });
    expect(result.answers.intent).toBeNull();
  });
});
