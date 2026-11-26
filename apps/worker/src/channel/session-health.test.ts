import { randomUUID } from 'node:crypto';
import { sessionName, WahaError, type SessionInfo } from '@app/channels';
import { ChannelStatus, createDb } from '@app/db';
import { AlertEvent } from '@app/observability';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { checkQrSessions } from './session-health.ts';

// RF-29: the periodic check notices a dropped QR code session once, and a missing one.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

async function qrChannel(status: ChannelStatus) {
  const tenant = await db.client.tenant.create({
    data: { name: 'Saúde da sessão (fictício)', slug: `qrh-${randomUUID()}` },
  });
  const channel = await db.withTenant(tenant.id, (tx) =>
    tx.channel.create({ data: { tenantId: tenant.id, kind: 'qr_gateway', status } }),
  );
  const session = sessionName(channel.id);
  await db.client.channelRoute.create({
    data: { accountId: session, tenantId: tenant.id, channelId: channel.id },
  });
  return { tenantId: tenant.id, session };
}

describe('QR session health (RF-29)', () => {
  it('a connected session WAHA reports FAILED or no longer knows goes down once', async () => {
    const failed = await qrChannel(ChannelStatus.connected);
    const missing = await qrChannel(ChannelStatus.connected);
    const working = await qrChannel(ChannelStatus.connected);
    const answers: Record<string, () => Promise<SessionInfo>> = {
      [failed.session]: () => Promise.resolve({ status: 'FAILED', phone: undefined }),
      [missing.session]: () => Promise.reject(new WahaError(404, 'not found')),
      [working.session]: () => Promise.resolve({ status: 'WORKING', phone: '5541999990009' }),
    };
    const sessions = {
      status: (name: string) =>
        answers[name]?.() ?? Promise.resolve({ status: 'WORKING', phone: undefined }),
    };
    const onDown = vi.fn();
    const alert = vi.fn();
    await checkQrSessions({ db, sessions, alert, onDown });
    expect(onDown).toHaveBeenCalledWith(failed.tenantId);
    expect(onDown).toHaveBeenCalledWith(missing.tenantId);
    expect(onDown).not.toHaveBeenCalledWith(working.tenantId);
    onDown.mockClear();
    await checkQrSessions({ db, sessions, alert, onDown });
    expect(onDown).not.toHaveBeenCalledWith(failed.tenantId);
  });

  it('an unreachable gateway is one operator alert, not a drop', async () => {
    const channel = await qrChannel(ChannelStatus.connected);
    const onDown = vi.fn();
    const alert = vi.fn();
    const sessions = { status: () => Promise.reject(new Error('ECONNREFUSED')) };
    await checkQrSessions({ db, sessions, alert, onDown });
    expect(onDown).not.toHaveBeenCalledWith(channel.tenantId);
    expect(alert).toHaveBeenCalledWith(AlertEvent.channelDisconnected, {
      code: 'waha_unreachable',
    });
  });
});
