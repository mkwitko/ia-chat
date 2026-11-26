import { randomUUID } from 'node:crypto';
import { IMPORT_STAGING_DAYS } from '@app/core';
import { createDb, MessageType } from '@app/db';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { purgeStagedImports } from './staging.ts';

// E-24b (H-49): staged contacts and message texts the owner did not decide on are purged after 7 days.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

const alert = vi.fn();
const DAY = 86_400_000;
const NOW = new Date('2027-02-01T12:00:00Z');
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

async function stage(createdAt: Date) {
  const tenant = await db.client.tenant.create({
    data: { name: 'Teste staging (fictício)', slug: `stg-${randomUUID()}` },
  });
  await db.withTenant(tenant.id, async (tx) => {
    const channel = await tx.channel.create({
      data: { tenantId: tenant.id, kind: 'cloud_api', coexistence: true },
    });
    const contact = await tx.importContact.create({
      data: { tenantId: tenant.id, channelId: channel.id, key: '+5541999990001', createdAt },
    });
    await tx.importMessage.create({
      data: {
        tenantId: tenant.id,
        importContactId: contact.id,
        providerMessageId: 'wamid.X',
        fromOwner: false,
        type: MessageType.text,
        text: 'texto fictício',
        at: createdAt,
        createdAt,
      },
    });
  });
  return tenant.id;
}

const counts = (tenantId: string) =>
  db.withTenant(tenantId, async (tx) => ({
    contacts: await tx.importContact.count(),
    messages: await tx.importMessage.count(),
  }));

describe('staging purge', () => {
  it('deletes staged rows older than the staging period and keeps the newer ones', async () => {
    const old = await stage(ago(IMPORT_STAGING_DAYS + 1));
    const fresh = await stage(ago(IMPORT_STAGING_DAYS - 1));
    const result = await purgeStagedImports({ db, alert, now: NOW, onlyTenantIds: [old, fresh] });
    expect(result.contacts).toBe(1);
    expect(await counts(old)).toEqual({ contacts: 0, messages: 0 });
    expect(await counts(fresh)).toEqual({ contacts: 1, messages: 1 });
  });

  it('is idempotent', async () => {
    const old = await stage(ago(IMPORT_STAGING_DAYS + 3));
    await purgeStagedImports({ db, alert, now: NOW, onlyTenantIds: [old] });
    const again = await purgeStagedImports({ db, alert, now: NOW, onlyTenantIds: [old] });
    expect(again.contacts).toBe(0);
  });
});
