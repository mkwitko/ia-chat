import { describe, expect, it } from 'vitest';
import { PlanId, canAddProfessional, extraProfessionals, usageStatus } from './plans.ts';

const at = (conversations: number, capCents: number | null = null) =>
  usageStatus({ plan: PlanId.essencial, conversations, capCents });

describe('usageStatus (franchise 300, R$ 0,40 per extra conversation)', () => {
  it('warns at 80% and fills at 100%', () => {
    expect(at(239)).toMatchObject({ warning: false, full: false });
    expect(at(240)).toMatchObject({ warning: true, full: false, percent: 80 });
    expect(at(300)).toMatchObject({ full: true, overageCents: 0, restricted: false });
  });

  it('counts overage and never restricts without a cap', () => {
    expect(at(350)).toMatchObject({ overageConversations: 50, overageCents: 2000, percent: 116 });
    expect(at(100_000).restricted).toBe(false);
  });

  it('restricts only when the overage passes the cap', () => {
    expect(at(350, 2000).restricted).toBe(false);
    expect(at(351, 2000).restricted).toBe(true);
    expect(at(300, 0).restricted).toBe(false);
    expect(at(301, 0).restricted).toBe(true);
  });
});

describe('professionals per plan (founder/pricing.md)', () => {
  it('Essencial, Agenda and Pro have one professional', () => {
    for (const plan of [PlanId.essencial, PlanId.agenda, PlanId.pro]) {
      expect(canAddProfessional(plan, 0)).toBe(true);
      expect(canAddProfessional(plan, 1)).toBe(false);
    }
  });

  it('Clínica includes two and adds paid extras beyond them', () => {
    expect(canAddProfessional(PlanId.clinica, 5)).toBe(true);
    expect(extraProfessionals(PlanId.clinica, 2)).toBe(0);
    expect(extraProfessionals(PlanId.clinica, 4)).toBe(2);
    expect(extraProfessionals(PlanId.agenda, 1)).toBe(0);
  });
});
