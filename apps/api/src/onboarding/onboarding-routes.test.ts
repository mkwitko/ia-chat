import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTenant,
  freshCpf,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';

// E-24: progress saved per tenant, example template applied once, policy respected. Guided order
// and requirements of the invite-only flow (H-37): CPF/CNPJ first, WhatsApp before activation.

interface View {
  steps: { step: string; status: string | null }[];
  current: string | null;
  specialty: string | null;
  pricesForbidden: boolean;
}
interface Created {
  services: number;
  answers: number;
}

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestApp();
});
afterAll(() => ctx.app.close());

async function newTenant() {
  const cookie = await signUpVerified(ctx);
  const tenantId = await createTenant(ctx, cookie);
  const call = (method: 'GET' | 'PUT' | 'POST', url: string, payload?: object) =>
    ctx.app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });
  return { call, tenantId };
}

const connectWhatsapp = (tenantId: string) =>
  ctx.db.withTenant(tenantId, (tx) =>
    tx.channel.create({ data: { tenantId, kind: 'cloud_api', status: 'connected' } }),
  );

describe('progress', () => {
  it('starts at CPF/CNPJ, saves each step and resumes after the last one done', async () => {
    const { call } = await newTenant();
    expect((await call('GET', '/api/onboarding')).json<View>().current).toBe('account');
    await call('POST', '/api/onboarding/specialty', { specialty: 'quiropraxia' });
    expect((await call('GET', '/api/onboarding')).json<View>().current).toBe('account');
    expect(
      (await call('PUT', '/api/onboarding/steps/account', { status: 'done' })).statusCode,
    ).toBe(409);
    await call('PUT', '/api/trial/document', { document: freshCpf() });
    await call('PUT', '/api/onboarding/steps/account', { status: 'done' });
    expect((await call('GET', '/api/onboarding')).json<View>().current).toBe('whatsapp');
    await call('PUT', '/api/onboarding/steps/whatsapp', { status: 'skipped' });
    await call('PUT', '/api/onboarding/steps/services', { status: 'done' });
    const resumed = (await call('GET', '/api/onboarding')).json<View>();
    expect(resumed.current).toBe('hours');
    expect(resumed.specialty).toBe('quiropraxia');
  });

  it('lets the WhatsApp be skipped without blocking the rest, but not the others', async () => {
    const { call } = await newTenant();
    const skip = (step: string) =>
      call('PUT', `/api/onboarding/steps/${step}`, { status: 'skipped' });
    expect((await skip('whatsapp')).statusCode).toBe(200);
    expect((await skip('hours')).statusCode).toBe(400);
  });

  it('marks the hours done only with a weekly grid (H-39)', async () => {
    const { call } = await newTenant();
    const hours = () => call('PUT', '/api/onboarding/steps/hours', { status: 'done' });
    expect((await hours()).json()).toEqual({ error: 'hours_required' });
    await call('PUT', '/api/availability', {
      rules: [{ weekday: 2, start: '07:00', end: '20:00' }],
    });
    expect((await hours()).statusCode).toBe(200);
  });

  it('lists what is left for later on Início (checklist), as facts only', async () => {
    const { call } = await newTenant();
    const view = (await call('GET', '/api/onboarding')).json<{ checklist: object }>();
    expect(view.checklist).toEqual({
      tone: false,
      reviewLink: false,
      packages: 0,
      unanswered: 0,
      team: false,
    });
  });

  it('activates only with the WhatsApp connected, in "aprovar antes de enviar"', async () => {
    const { call, tenantId } = await newTenant();
    await ctx.db.client.tenant.update({ where: { id: tenantId }, data: { autonomy: 'auto' } });
    const activate = () => call('PUT', '/api/onboarding/steps/activation', { status: 'done' });
    expect((await activate()).json()).toEqual({ error: 'whatsapp_not_connected' });
    expect(
      (await call('PUT', '/api/onboarding/steps/whatsapp', { status: 'done' })).statusCode,
    ).toBe(409);
    await connectWhatsapp(tenantId);
    expect((await activate()).statusCode).toBe(200);
    const tenant = await ctx.db.client.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    expect(tenant.autonomy).toBe('approve');
  });
});

describe('specialty template', () => {
  const rows = (tenantId: string) =>
    ctx.db.withTenant(tenantId, async (tx) => ({
      services: await tx.service.findMany(),
      items: await tx.knowledgeItem.findMany(),
    }));

  it('applying twice does not duplicate', async () => {
    const { call, tenantId } = await newTenant();
    await call('POST', '/api/onboarding/specialty', { specialty: 'quiropraxia' });
    const once = (await call('POST', '/api/onboarding/template')).json<Created>();
    const twice = (await call('POST', '/api/onboarding/template')).json<Created>();
    expect(once.services).toBeGreaterThan(0);
    expect(twice).toEqual({ services: 0, answers: 0 });
    const { services, items } = await rows(tenantId);
    expect(services).toHaveLength(once.services);
    expect(items).toHaveLength(once.answers);
  });

  it('allows prices where the policy allows them', async () => {
    const { call, tenantId } = await newTenant();
    await call('POST', '/api/onboarding/specialty', { specialty: 'quiropraxia' });
    await call('POST', '/api/onboarding/template');
    const { services } = await rows(tenantId);
    expect(services.every((service) => service.priceCents > 0)).toBe(true);
  });

  it('puts no price in services or answers when the policy forbids prices', async () => {
    const { call, tenantId } = await newTenant();
    const view = (
      await call('POST', '/api/onboarding/specialty', { specialty: 'nutricao' })
    ).json<View>();
    expect(view.pricesForbidden).toBe(true);
    await call('POST', '/api/onboarding/template');
    const { services, items } = await rows(tenantId);
    expect(services.length).toBeGreaterThan(0);
    expect(services.every((service) => service.priceCents === 0)).toBe(true);
    expect(items.some((item) => /custa|valor/i.test(item.question))).toBe(false);
  });

  it('needs a specialty first', async () => {
    const { call } = await newTenant();
    expect((await call('POST', '/api/onboarding/template')).statusCode).toBe(409);
  });
});
