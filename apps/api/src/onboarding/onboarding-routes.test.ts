import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenant, signUpVerified, startTestApp, type TestContext } from '../test-support.ts';

// E-24: progress saved per tenant, example template applied once, policy respected.

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

describe('progress', () => {
  it('starts at the first step, saves each step and resumes after the last one done', async () => {
    const { call } = await newTenant();
    const first = (await call('GET', '/api/onboarding')).json<View>();
    expect(first.current).toBe('account');
    await call('POST', '/api/onboarding/specialty', { specialty: 'quiropraxia' });
    await call('PUT', '/api/onboarding/steps/services', { status: 'done' });
    const resumed = (await call('GET', '/api/onboarding')).json<View>();
    expect(resumed.current).toBe('location');
    expect(resumed.specialty).toBe('quiropraxia');
  });

  it('lets external steps be skipped without blocking the rest, but not the others', async () => {
    const { call } = await newTenant();
    const skip = (step: string) =>
      call('PUT', `/api/onboarding/steps/${step}`, { status: 'skipped' });
    expect((await skip('whatsapp')).statusCode).toBe(200);
    expect((await skip('google')).statusCode).toBe(200);
    expect((await skip('tone')).statusCode).toBe(400);
  });

  it('keeps activation in "aprovar antes de enviar"', async () => {
    const { call, tenantId } = await newTenant();
    await ctx.db.client.tenant.update({ where: { id: tenantId }, data: { autonomy: 'auto' } });
    await call('PUT', '/api/onboarding/steps/activation', { status: 'done' });
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
