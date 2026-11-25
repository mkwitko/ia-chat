import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTenant,
  freshCpf,
  signUpVerified,
  startTestApp,
  uniqueEmail,
  type TestContext,
} from '../test-support.ts';

// S-05: 14-day trial from the WhatsApp (H-24), one trial per document, operator funnel.

const operatorEmail = uniqueEmail();
const CPF = '529.982.247-25';
const CPF_DIGITS = '52998224725';
const CNPJ = '11.222.333/0001-81';
const TRIAL_DAYS = 14;

interface TrialBody {
  phase: string;
  daysLeft: number;
  dataKeptUntil: string | null;
  documentSet: boolean;
}
interface Funnel {
  signups: number;
  steps: { step: string; count: number }[];
}

let ctx: TestContext;
let operator: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, { env: { OPERATOR_EMAILS: operatorEmail } });
  operator = await signUpVerified(ctx, operatorEmail);
});
afterAll(() => ctx.app.close());

async function newTenant() {
  const cookie = await signUpVerified(ctx);
  const tenantId = await createTenant(ctx, cookie);
  const call = (method: 'GET' | 'PUT' | 'POST', url: string, payload?: object) =>
    ctx.app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });
  return { call, tenantId };
}

describe('trial', () => {
  it('waits for the WhatsApp, then runs 14 days without card (H-24)', async () => {
    const { call, tenantId } = await newTenant();
    expect((await call('GET', '/api/trial')).json<TrialBody>()).toMatchObject({ phase: 'none' });
    await ctx.db.withTenant(tenantId, (tx) =>
      tx.channel.create({ data: { tenantId, kind: 'cloud_api', status: 'connected' } }),
    );
    const body = (await call('GET', '/api/trial')).json<TrialBody>();
    expect(body).toMatchObject({ phase: 'active', daysLeft: TRIAL_DAYS, documentSet: false });
  });

  it('shows the ended state with the data retention date', async () => {
    const { call, tenantId } = await newTenant();
    await ctx.db.client.tenant.update({
      where: { id: tenantId },
      data: { status: 'restricted', autonomy: 'off', trialEndedAt: new Date() },
    });
    const body = (await call('GET', '/api/trial')).json<TrialBody>();
    expect(body.phase).toBe('ended');
    expect(body.dataKeptUntil).not.toBeNull();
  });

  it('keeps the assistant off if activation is saved after the trial ended', async () => {
    const { call, tenantId } = await newTenant();
    await ctx.db.client.tenant.update({
      where: { id: tenantId },
      data: { status: 'restricted', autonomy: 'off', trialEndedAt: new Date() },
    });
    await call('PUT', '/api/onboarding/steps/activation', { status: 'done' });
    const tenant = await ctx.db.client.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    expect(tenant.autonomy).toBe('off');
  });
});

describe('one trial per document (RF-81)', () => {
  it('accepts a valid CPF once and refuses the same document on another tenant', async () => {
    await ctx.db.client.tenant.updateMany({
      where: { document: CPF_DIGITS },
      data: { document: null },
    });
    const first = await newTenant();
    const second = await newTenant();
    expect((await first.call('PUT', '/api/trial/document', { document: CPF })).statusCode).toBe(
      200,
    );
    const stored = await ctx.db.client.tenant.findUniqueOrThrow({ where: { id: first.tenantId } });
    expect(stored.document).toBe(CPF_DIGITS);
    const again = await second.call('PUT', '/api/trial/document', { document: CPF_DIGITS });
    expect(again.statusCode).toBe(409);
    expect((await first.call('GET', '/api/trial')).json<TrialBody>().documentSet).toBe(true);
  });

  it('rejects documents with wrong check digits', async () => {
    const { call } = await newTenant();
    expect(
      (await call('PUT', '/api/trial/document', { document: '529.982.247-24' })).statusCode,
    ).toBe(400);
    expect(
      (await call('PUT', '/api/trial/document', { document: CNPJ.slice(0, -1) + '0' })).statusCode,
    ).toBe(400);
  });
});

describe('funnel for the operator (RF-86)', () => {
  const funnel = async () =>
    (
      await ctx.app.inject({
        method: 'GET',
        url: '/api/operator/funnel',
        headers: { cookie: operator },
      })
    ).json<Funnel>();
  const count = (f: Funnel, step: string) => f.steps.find((s) => s.step === step)?.count ?? 0;

  it('counts each settled step and a new signup', async () => {
    const before = await funnel();
    const { call } = await newTenant();
    await call('PUT', '/api/trial/document', { document: freshCpf() });
    await call('POST', '/api/onboarding/specialty', { specialty: 'quiropraxia' });
    await call('PUT', '/api/onboarding/steps/services', { status: 'done' });
    const after = await funnel();
    expect(after.signups).toBeGreaterThanOrEqual(before.signups + 1);
    expect(count(after, 'account')).toBeGreaterThanOrEqual(count(before, 'account') + 1);
    expect(count(after, 'services')).toBeGreaterThanOrEqual(count(before, 'services') + 1);
  });

  it('is closed to anyone who is not an operator', async () => {
    const { call } = await newTenant();
    expect((await call('GET', '/api/operator/funnel')).statusCode).toBe(403);
  });
});
