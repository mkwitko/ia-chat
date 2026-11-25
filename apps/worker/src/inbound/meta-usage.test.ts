import { randomUUID } from 'node:crypto';
import { InboundKind, type InboundEvent } from '@app/channels';
import { createDb, MetaCategory } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { applyInboundEvents } from './apply.ts';

// H-05: the status `pricing` object becomes one usage row per message, once.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

const status = (id: string, category: string, billable: boolean): InboundEvent => ({
  kind: InboundKind.status,
  providerMessageId: id,
  status: 'delivered',
  at: new Date('2027-01-15T12:00:00Z'),
  pricing: { billable, category, type: billable ? 'regular' : 'free_customer_service' },
});

describe('Meta usage from statuses', () => {
  it('records each message once, per month, and maps unknown categories to other', async () => {
    const tenant = await db.client.tenant.create({
      data: { name: 'Teste H-05 (fictício)', slug: `e28-${randomUUID()}` },
    });
    const tenantId = tenant.id;
    const { id: channelId } = await db.withTenant(tenantId, (tx) =>
      tx.channel.create({ data: { tenantId, kind: 'cloud_api' } }),
    );
    const events = [
      status('wamid.A', 'service', false),
      status('wamid.A', 'service', false), // repeated status of the same message
      status('wamid.B', 'utility', true),
      status('wamid.C', 'novidade_da_meta', true),
    ];
    await db.withTenant(tenantId, (tx) => applyInboundEvents(tx, { tenantId, channelId, events }));
    await db.withTenant(tenantId, (tx) => applyInboundEvents(tx, { tenantId, channelId, events }));
    const rows = await db.withTenant(tenantId, (tx) =>
      tx.metaMessageUsage.findMany({ orderBy: { providerMessageId: 'asc' } }),
    );
    expect(rows.map((r) => [r.providerMessageId, r.category, r.billable])).toEqual([
      ['wamid.A', MetaCategory.service, false],
      ['wamid.B', MetaCategory.utility, true],
      ['wamid.C', MetaCategory.other, true],
    ]);
    expect(rows[0]?.month.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});
