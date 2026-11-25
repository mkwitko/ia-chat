import { describe, expect, it } from 'vitest';
import { PlanId } from '../plans.ts';
import { AsaasClient, paymentState } from './asaas.ts';
import { daysOverdue, overageOf, overdueStage, previousMonth } from './ladder.ts';
import { PaymentState } from './provider.ts';

describe('overdue ladder', () => {
  it('notices on day 0 and 3, restricts at 7', () => {
    expect(overdueStage(0)).toEqual({ notice: 1, restrict: false });
    expect(overdueStage(2)).toEqual({ notice: 1, restrict: false });
    expect(overdueStage(3)).toEqual({ notice: 2, restrict: false });
    expect(overdueStage(7)).toEqual({ notice: 2, restrict: true });
  });
  it('counts whole days from the due date', () => {
    const since = new Date('2027-03-01T00:00:00Z');
    expect(daysOverdue(since, new Date('2027-03-04T23:00:00Z'))).toBe(3);
  });
});

describe('overage', () => {
  it('is the conversations above the franchise times the unit price, in cents', () => {
    expect(overageOf(PlanId.essencial, 300)).toBe(0);
    expect(overageOf(PlanId.essencial, 350)).toBe(2000);
  });
  it('closes the month before now', () => {
    expect(previousMonth(new Date('2027-01-15T12:00:00Z')).toISOString()).toBe(
      '2026-12-01T00:00:00.000Z',
    );
  });
});

describe('Asaas client', () => {
  it('maps statuses', () => {
    expect(paymentState('CONFIRMED')).toBe(PaymentState.paid);
    expect(paymentState('OVERDUE')).toBe(PaymentState.overdue);
    expect(paymentState('PENDING')).toBe(PaymentState.pending);
    expect(paymentState('REFUNDED')).toBe(PaymentState.other);
  });

  it('sends reais, the access token and a user agent; reads cents back', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fake = ((url: string, init: RequestInit) => {
      calls.push({ url, init });
      return Promise.resolve(
        Response.json({ id: 'sub_1', nextDueDate: '2027-03-10', status: 'ACTIVE' }),
      );
    }) as unknown as typeof fetch;
    const client = new AsaasClient({ apiKey: 'k', baseUrl: 'http://asaas.test/v3', fetch: fake });
    const sub = await client.createSubscription({
      customerId: 'cus_1',
      cents: 19_700,
      firstDueDate: '2027-03-10',
      description: 'x',
      tenantId: 't',
    });
    expect(sub).toEqual({ id: 'sub_1', active: true, nextDueDate: '2027-03-10' });
    expect(calls[0]?.url).toBe('http://asaas.test/v3/subscriptions');
    expect(JSON.parse(calls[0]?.init.body as string)).toMatchObject({ value: 197 });
    expect(calls[0]?.init.headers).toMatchObject({ access_token: 'k' });
  });
});
