import { monthOf } from '@app/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenant, signUpVerified, startTestApp, type TestContext } from '../test-support.ts';
import { metaOverview } from './meta-overview.ts';

// H-05: operator aggregate of Meta usage. Counts and tenant names only.

const MARKETING_CENTS = 32; // R$ 0,3217 rounded to cents

let ctx: TestContext;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp();
  tenantId = await createTenant(ctx, await signUpVerified(ctx));
});
afterAll(() => ctx.app.close());

describe('metaOverview', () => {
  it('sums billable messages across tenants and ranks tenants by estimated cost (shared test db)', async () => {
    const now = new Date();
    await ctx.db.withTenant(tenantId, async (tx) => {
      const channel = await tx.channel.create({ data: { tenantId, kind: 'cloud_api' } });
      await tx.metaMessageUsage.create({
        data: {
          tenantId,
          channelId: channel.id,
          providerMessageId: 'wamid.marketing.1',
          month: monthOf(now),
          category: 'marketing',
          billable: true,
        },
      });
    });
    const overview = await metaOverview(ctx.db, now);
    expect(overview.totals.marketingBillable).toBeGreaterThanOrEqual(1);
    const costs = overview.top.map((row) => row.estimatedCostCents);
    expect(costs).toEqual([...costs].sort((a, b) => b - a));
    expect(costs[0]).toBeGreaterThanOrEqual(MARKETING_CENTS);
    expect(JSON.stringify(overview)).not.toMatch(/wamid/);
  });
});
