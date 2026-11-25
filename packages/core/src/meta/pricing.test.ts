import { describe, expect, it } from 'vitest';
import { MetaCategory as C, summarizeMetaUsage } from './pricing.ts';

const row = (
  category: C,
  count: number,
  extra: { billable?: boolean; channelId?: string } = {},
) => ({
  channelId: extra.channelId ?? 'c1',
  category,
  billable: extra.billable ?? false,
  count,
});

describe('summarizeMetaUsage', () => {
  it('is free under the allowance', () => {
    expect(summarizeMetaUsage([row(C.service, 640)])).toMatchObject({
      serviceUsed: 640,
      serviceFree: 1000,
      serviceOver: 0,
      estimatedCostCents: 0,
    });
  });

  it('charges service past 1.000, per channel, plus billable templates', () => {
    const summary = summarizeMetaUsage([
      row(C.service, 1200),
      row(C.service, 500, { channelId: 'c2' }),
      row(C.utility, 100, { billable: true }),
      row(C.utility, 50),
      row(C.marketing, 10, { billable: true }),
    ]);
    expect(summary.serviceOver).toBe(200);
    expect(summary.serviceFree).toBe(2000);
    expect(summary.billable).toMatchObject({ utility: 100, marketing: 10, service: 200 });
    // 200*3500 + 100*3500 + 10*32170 = 1.371.700 milli-cents
    expect(summary.estimatedCostCents).toBe(1372);
  });

  it('handles no rows', () => {
    expect(summarizeMetaUsage([])).toMatchObject({ serviceFree: 1000, estimatedCostCents: 0 });
  });
});
