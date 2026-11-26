import { describe, expect, it } from 'vitest';
import { groupPending, type PendingRow } from './unanswered-groups.ts';

const row = (id: string, question: string, day: number): PendingRow => ({
  id,
  question,
  createdAt: new Date(Date.UTC(2026, 10, day)),
});

describe('groupPending', () => {
  it('groups exact duplicates ignoring case, accents and punctuation', () => {
    const groups = groupPending([
      row('a', 'Tem estacionamento?', 1),
      row('b', 'tem estacionamento', 2),
      row('c', 'TÉM ESTACIONAMENTO???', 3),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ ids: ['a', 'b', 'c'], count: 3 });
  });

  it('groups near duplicates by shared words', () => {
    const groups = groupPending([
      row('a', 'Vocês aceitam plano de saúde?', 1),
      row('b', 'aceita plano de saude', 2),
      row('c', 'Tem estacionamento perto?', 3),
    ]);
    expect(groups.map((group) => group.ids)).toEqual([['a', 'b'], ['c']]);
  });

  it('keeps different questions apart and orders by how often they were asked', () => {
    const groups = groupPending([
      row('a', 'Atende criança?', 1),
      row('b', 'Qual o endereço?', 2),
      row('c', 'qual é o endereço', 3),
    ]);
    expect(groups.map((group) => group.count)).toEqual([2, 1]);
    expect(groups[0]?.question).toBe('qual é o endereço');
  });

  it('does not merge a question made only of stop words with another', () => {
    expect(groupPending([row('a', 'e aí?', 1), row('b', 'Tem estacionamento?', 2)])).toHaveLength(
      2,
    );
  });
});
