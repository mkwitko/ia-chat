import { describe, expect, it } from 'vitest';
import { buildFunnel } from '../onboarding/funnel.ts';
import { lastStepAt, markStep, parseProgress } from '../onboarding/steps.ts';
import { isValidDocument, normalizeDocument } from './document.ts';
import { abandonmentEmail, trialEndedEmail } from './emails.ts';
import {
  Reminder,
  reminderDue,
  TRIAL_CONVERSATION_CAP,
  trialCapReached,
  trialExpired,
  trialView,
} from './trial.ts';

const DAY = 86_400_000;
const T0 = new Date('2027-02-01T12:00:00Z');
const after = (days: number) => new Date(T0.getTime() + days * DAY);
const NONE: { first: Date | null; second: Date | null } = { first: null, second: null };

describe('trialView', () => {
  const base = { status: 'trial', trialEndsAt: after(14), trialEndedAt: null };
  it('counts whole days left, rounding up', () => {
    expect(trialView({ ...base, now: T0 })).toMatchObject({ phase: 'active', daysLeft: 14 });
    expect(trialView({ ...base, now: after(13.5) })).toMatchObject({ daysLeft: 1 });
  });
  it('has no trial without an end date (the pilot) or once active', () => {
    expect(trialView({ ...base, trialEndsAt: null, now: T0 }).phase).toBe('none');
    expect(trialView({ ...base, status: 'active', now: T0 }).phase).toBe('none');
  });
  it('keeps the data for 30 days after the end', () => {
    const ended = { ...base, status: 'restricted', trialEndedAt: after(14), now: after(15) };
    expect(trialView(ended)).toMatchObject({
      phase: 'ended',
      dataKeptUntil: after(44).toISOString(),
    });
  });
  it('subscribing after the end leaves the ended state', () => {
    const paid = { ...base, status: 'active', trialEndedAt: after(14), now: after(20) };
    expect(trialView(paid).phase).toBe('none');
  });
});

describe('limits (RF-81)', () => {
  it('stops a trial at the conversation cap, not a paying tenant', () => {
    const at = (status: string, conversations: number) =>
      trialCapReached({ status, conversations });
    expect(at('trial', TRIAL_CONVERSATION_CAP - 1)).toBe(false);
    expect(at('trial', TRIAL_CONVERSATION_CAP)).toBe(true);
    expect(at('active', TRIAL_CONVERSATION_CAP)).toBe(false);
  });
  it('expires exactly at the end date', () => {
    expect(trialExpired(after(14), after(14))).toBe(true);
    expect(trialExpired(after(14), after(13))).toBe(false);
    expect(trialExpired(null, after(99))).toBe(false);
  });
  it('validates CPF and CNPJ check digits', () => {
    expect(isValidDocument('529.982.247-25')).toBe(true);
    expect(isValidDocument('529.982.247-24')).toBe(false);
    expect(isValidDocument('11.222.333/0001-81')).toBe(true);
    expect(isValidDocument('11.222.333/0001-80')).toBe(false);
    expect(isValidDocument('111.111.111-11')).toBe(false);
    expect(normalizeDocument('529.982.247-25')).toBe('52998224725');
  });
});

describe('reminderDue (RF-84)', () => {
  const due = (idleDays: number, sent = NONE) =>
    reminderDue({ lastActivityAt: T0, now: after(idleDays), sent });
  it('first at 1 day, second at 3 days, each once', () => {
    expect(due(0.9)).toBeNull();
    expect(due(1)).toBe(Reminder.first);
    expect(due(2, { first: T0, second: null })).toBeNull();
    expect(due(3, { first: T0, second: null })).toBe(Reminder.second);
    expect(due(9, { first: T0, second: T0 })).toBeNull();
  });
  it('a late sweep sends only the latest', () => {
    expect(due(5)).toBe(Reminder.second);
    expect(due(5, { first: null, second: T0 })).toBeNull();
  });
});

describe('funnel and step marks', () => {
  it('counts tenants per settled step', () => {
    const a = parseProgress({});
    markStep(a, { step: 'account', status: 'done', now: T0 });
    markStep(a, { step: 'services', status: 'done', now: after(1) });
    const b = parseProgress({});
    markStep(b, { step: 'account', status: 'done', now: T0 });
    const funnel = buildFunnel([a, b, {}]);
    const count = (step: string) => funnel.steps.find((s) => s.step === step)?.count;
    expect(funnel.signups).toBe(3);
    expect(count('account')).toBe(2);
    expect(count('services')).toBe(1);
    expect(count('activation')).toBe(0);
    expect(lastStepAt(a)).toEqual(after(1));
    expect(lastStepAt(parseProgress({}))).toBeNull();
  });
});

describe('emails', () => {
  it('reminders link to the setup and offer assisted setup', () => {
    const email = abandonmentEmail({
      to: 'a@exemplo.test',
      stage: 'first',
      resumeUrl: 'https://x/configuracao',
    });
    expect(email.text).toContain('https://x/configuracao');
    expect(email.text).toContain('15 minutos');
  });
  it('trial end says the assistant is off and how long data is kept', () => {
    const email = trialEndedEmail({
      to: 'a@exemplo.test',
      panelUrl: 'https://x',
      keptUntil: '15/03/2027',
    });
    expect(email.text).toContain('desligado');
    expect(email.text).toContain('30 dias');
  });
});
