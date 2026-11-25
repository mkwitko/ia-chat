import { monthOf } from '@app/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';

// E-18: GET /api/usage and PUT /api/usage/cap (owner only, audited).

let ctx: TestContext;
let owner: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
});
afterAll(() => ctx.app.close());

interface Call {
  cookie?: string;
  payload?: object;
}
const call = (method: 'GET' | 'PUT', url: string, { cookie = owner, payload }: Call = {}) =>
  ctx.app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });

describe('usage', () => {
  it('starts empty on the essencial franchise', async () => {
    const response = await call('GET', '/api/usage');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      plan: 'essencial',
      conversations: 0,
      franchise: 300,
      percent: 0,
      overageCents: 0,
      capCents: null,
      restricted: false,
    });
  });

  it('reports the month, the overage estimate and the cap', async () => {
    const month = monthOf(new Date());
    await ctx.db.withTenant(tenantId, (tx) =>
      tx.usageCounter.create({
        data: { tenantId, month, conversations: 350, messagesByCategory: { patient: 900 } },
      }),
    );
    expect(
      (await call('PUT', '/api/usage/cap', { cookie: owner, payload: { capCents: 1500 } }))
        .statusCode,
    ).toBe(200);
    expect((await call('GET', '/api/usage')).json()).toMatchObject({
      conversations: 350,
      percent: 116,
      overageConversations: 50,
      overageCents: 2000,
      capCents: 1500,
      restricted: true,
      messagesByCategory: { patient: 900 },
    });
    await call('PUT', '/api/usage/cap', { cookie: owner, payload: { capCents: null } });
    expect((await call('GET', '/api/usage')).json()).toMatchObject({
      capCents: null,
      restricted: false,
    });
  });

  it('audits the cap and refuses invalid values', async () => {
    expect(
      (await call('PUT', '/api/usage/cap', { cookie: owner, payload: { capCents: -5 } }))
        .statusCode,
    ).toBe(400);
    expect(
      (await call('PUT', '/api/usage/cap', { cookie: owner, payload: { capCents: 1.5 } }))
        .statusCode,
    ).toBe(400);
    const entries = await ctx.db.withTenant(tenantId, (tx) =>
      tx.auditLog.findMany({ where: { entity: 'overage_cap' }, orderBy: { createdAt: 'asc' } }),
    );
    expect(entries.at(0)).toMatchObject({ before: { capCents: null }, after: { capCents: 1500 } });
    expect(entries).toHaveLength(2);
  });

  it('reports the Meta allowance and cost of the month, for the owner only', async () => {
    const month = monthOf(new Date());
    await ctx.db.withTenant(tenantId, async (tx) => {
      const channel = await tx.channel.create({ data: { tenantId, kind: 'cloud_api' } });
      const row = (n: number, category: 'service' | 'utility', billable: boolean) => ({
        tenantId,
        channelId: channel.id,
        providerMessageId: `wamid.${category}.${String(n)}`,
        month,
        category,
        billable,
      });
      await tx.metaMessageUsage.createMany({
        data: [
          ...Array.from({ length: 640 }, (_, n) => row(n, 'service', false)),
          ...Array.from({ length: 10 }, (_, n) => row(n, 'utility', true)),
        ],
      });
    });
    expect((await call('GET', '/api/usage/meta')).json()).toMatchObject({
      serviceUsed: 640,
      serviceFree: 1000,
      serviceOver: 0,
      billable: { utility: 10 },
      estimatedCostCents: 35, // 10 x R$ 0,035
    });
    const professional = await joinAs(ctx, {
      ownerCookie: owner,
      tenantId,
      role: Role.professional,
    });
    expect((await call('GET', '/api/usage/meta', { cookie: professional })).statusCode).toBe(403);
  });

  it('lets only the owner change the cap', async () => {
    const professional = await joinAs(ctx, {
      ownerCookie: owner,
      tenantId,
      role: Role.professional,
    });
    expect(
      (await call('PUT', '/api/usage/cap', { cookie: professional, payload: { capCents: 0 } }))
        .statusCode,
    ).toBe(403);
    expect((await call('GET', '/api/usage', { cookie: professional })).statusCode).toBe(403);
  });
});
