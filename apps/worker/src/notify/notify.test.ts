import { randomUUID } from 'node:crypto';
import { createDb } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { createNotifier, type PushTarget, type SendPush, type VapidConfig } from './push.ts';
import { buildNotice, NotifyReason } from './reasons.ts';

// E-16 (RN-38): the professional is notified for real, and the notice never carries content.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

const VAPID: VapidConfig = { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:a@b.test' };
const SECRET_TEXT = 'dor forte nas costas, meu CPF é 000.000.000-00';

async function tenantWithDevices(endpoints: string[]) {
  const tenant = await db.client.tenant.create({
    data: { name: 'Push (fictício)', slug: `push-${randomUUID()}` },
  });
  const user = await db.client.user.create({
    data: { name: 'Pessoa Fictícia', email: `push-${randomUUID()}@exemplo.test` },
  });
  await db.withTenant(tenant.id, (tx) =>
    tx.pushSubscription.createMany({
      data: endpoints.map((endpoint) => ({
        tenantId: tenant.id,
        userId: user.id,
        endpoint,
        p256dh: 'k',
        auth: 'a',
      })),
    }),
  );
  return tenant.id;
}

function setup(send: SendPush, vapid: VapidConfig | null = VAPID) {
  const logs: { fields: object; message: string }[] = [];
  const push = (fields: object, message: string) => logs.push({ fields, message });
  const notify = createNotifier({ db, vapid, send, log: { warn: push, info: push } });
  return { notify, logs };
}

describe('notice text (RN-38)', () => {
  it('has no message content, only what happened and the conversation link', () => {
    const conversationId = randomUUID();
    for (const reason of Object.values(NotifyReason)) {
      const notice = buildNotice(reason, conversationId);
      expect(JSON.stringify(notice)).not.toContain(SECRET_TEXT);
      const usage = reason === NotifyReason.usageWarning || reason === NotifyReason.usageFull;
      expect(notice.url).toBe(usage ? '/mais/plano-e-uso' : `/conversas/${conversationId}`);
      expect(notice.title.length).toBeGreaterThan(0);
    }
    expect(buildNotice(NotifyReason.urgency, conversationId).urgent).toBe(true);
    expect(buildNotice(NotifyReason.handoff, conversationId).urgent).toBe(false);
  });
});

describe('push delivery', () => {
  it('sends to every device of the tenant and only to them', async () => {
    const mine = await tenantWithDevices([
      `https://push.test/${randomUUID()}`,
      `https://push.test/${randomUUID()}`,
    ]);
    await tenantWithDevices([`https://push.test/other-${randomUUID()}`]);
    const sent: { target: PushTarget; payload: string }[] = [];
    const { notify } = setup((target, payload) => {
      sent.push({ target, payload });
      return Promise.resolve();
    });
    const conversationId = randomUUID();
    await notify({ tenantId: mine, conversationId, reason: NotifyReason.handoff });
    expect(sent).toHaveLength(2);
    expect(sent.every(({ target }) => !target.endpoint.includes('other'))).toBe(true);
    expect(JSON.parse(sent[0]?.payload ?? '{}')).toMatchObject({
      url: `/conversas/${conversationId}`,
      tag: conversationId,
    });
  });

  it('drops subscriptions the push service reports gone and keeps the others', async () => {
    const dead = `https://push.test/dead-${randomUUID()}`;
    const alive = `https://push.test/alive-${randomUUID()}`;
    const tenantId = await tenantWithDevices([dead, alive]);
    const { notify } = setup((target) =>
      target.endpoint === dead
        ? Promise.reject(Object.assign(new Error('gone'), { statusCode: 410 }))
        : Promise.resolve(),
    );
    await notify({ tenantId, conversationId: randomUUID(), reason: NotifyReason.urgency });
    const left = await db.withTenant(tenantId, (tx) => tx.pushSubscription.findMany());
    expect(left.map((row) => row.endpoint)).toEqual([alive]);
  });

  it('without keys it only logs ids, never content, and sends nothing', async () => {
    const tenantId = await tenantWithDevices([`https://push.test/${randomUUID()}`]);
    let calls = 0;
    const { notify, logs } = setup(() => {
      calls += 1;
      return Promise.resolve();
    }, null);
    await notify({ tenantId, conversationId: randomUUID(), reason: NotifyReason.urgency });
    expect(calls).toBe(0);
    expect(logs).toHaveLength(1);
    expect(JSON.stringify(logs)).not.toContain(SECRET_TEXT);
  });
});
