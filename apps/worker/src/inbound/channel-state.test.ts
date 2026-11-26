import { randomUUID } from 'node:crypto';
import { ChannelState } from '@app/channels';
import { ChannelStatus, createDb } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { applyChannelState } from './channel-state.ts';

// RF-29: a session that drops is noticed once; pairing noise is not a drop.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

async function channelWith(status: ChannelStatus) {
  const tenant = await db.client.tenant.create({
    data: { name: 'Sessão QR (fictício)', slug: `qr-${randomUUID()}` },
  });
  const channel = await db.withTenant(tenant.id, (tx) =>
    tx.channel.create({ data: { tenantId: tenant.id, kind: 'qr_gateway', status } }),
  );
  const apply = (state: ChannelState) =>
    db.withTenant(tenant.id, (tx) => applyChannelState(tx, channel.id, state));
  const current = () =>
    db.withTenant(tenant.id, (tx) => tx.channel.findUniqueOrThrow({ where: { id: channel.id } }));
  return { apply, current };
}

describe('channel state (RF-29)', () => {
  it('a connected channel that drops is reported once', async () => {
    const channel = await channelWith(ChannelStatus.connected);
    expect(await channel.apply(ChannelState.disconnected)).toBe(true);
    expect((await channel.current()).status).toBe(ChannelStatus.disconnected);
    expect(await channel.apply(ChannelState.disconnected)).toBe(false);
  });

  it('while pairing, a session asking for a QR code is not a drop', async () => {
    const channel = await channelWith(ChannelStatus.pending);
    expect(await channel.apply(ChannelState.disconnected)).toBe(false);
    expect((await channel.current()).status).toBe(ChannelStatus.pending);
    expect(await channel.apply(ChannelState.connected)).toBe(false);
    expect((await channel.current()).status).toBe(ChannelStatus.connected);
  });
});
