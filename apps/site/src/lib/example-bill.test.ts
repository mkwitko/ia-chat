import { describe, expect, it } from 'vitest';
import { exampleBill } from './example-bill.ts';

const NBSP = /\s/g;

describe('exampleBill', () => {
  it('adds the Meta estimate of 400 conversations to the Agenda plan', () => {
    const bill = exampleBill();
    expect(bill.conversations).toBe('400');
    expect(bill.planPrice.replace(NBSP, ' ')).toBe('R$ 297,00');
    expect(bill.metaAbout.replace(NBSP, ' ')).toBe('R$ 55');
    expect(bill.totalAbout.replace(NBSP, ' ')).toBe('R$ 352');
    expect(bill.freeReplies).toBe('1.000');
  });
});
