import { randomUUID } from 'node:crypto';
import {
  markStep,
  parseProgress,
  TRIAL_CONVERSATION_CAP,
  monthOf,
  type EmailMessage,
} from '@app/core';
import { createDb } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { isRestricted } from '../conversation/restricted.ts';
import { sweepTrials } from './sweep.ts';

// S-05: reminders at 1 and 3 days, once each; end of trial; conversation cap during the trial.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

const DAY = 86_400_000;
const URLS = { resume: 'http://app.test/configuracao', panel: 'http://app.test/' };
const CREATED = new Date('2027-03-01T12:00:00Z');
const after = (days: number) => new Date(CREATED.getTime() + days * DAY);

async function setup(progress: object = {}) {
  const tenant = await db.client.tenant.create({
    data: {
      name: 'Teste (fictício)',
      slug: `trial-${randomUUID()}`,
      createdAt: CREATED,
      trialEndsAt: after(14),
      onboardingProgress: progress,
    },
  });
  const email = `dono-${randomUUID()}@exemplo.test`;
  const user = await db.client.user.create({
    data: { name: 'Dono', email, emailVerified: true },
  });
  await db.withTenant(tenant.id, (tx) =>
    tx.membership.create({ data: { tenantId: tenant.id, userId: user.id, role: 'owner' } }),
  );
  const sent: EmailMessage[] = [];
  const sweep = (now: Date) =>
    sweepTrials({
      db,
      now,
      urls: URLS,
      onlyTenantId: tenant.id,
      email: {
        send: (m) => {
          sent.push(m);
          return Promise.resolve();
        },
      },
      alert: () => undefined,
    });
  const row = () => db.client.tenant.findUniqueOrThrow({ where: { id: tenant.id } });
  return { tenantId: tenant.id, email, sent, sweep, row };
}

describe('abandonment reminders (RF-84)', () => {
  it('sends at 1 day and at 3 days, once each, to the owner, with the resume link', async () => {
    const { email, sent, sweep } = await setup();
    await sweep(after(0.5));
    expect(sent).toHaveLength(0);
    await sweep(after(1));
    await sweep(after(1.2));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: email });
    expect(sent[0]?.text).toContain(URLS.resume);
    expect(sent[0]?.text).toContain('15 minutos');
    await sweep(after(3));
    await sweep(after(4));
    expect(sent).toHaveLength(2);
  });

  it('measures idleness from the last step, and skips finished onboardings', async () => {
    const progress = parseProgress({});
    markStep(progress, { step: 'account', status: 'done', now: after(2.5) });
    const { sent, sweep } = await setup(progress);
    await sweep(after(3));
    expect(sent).toHaveLength(0);
    await sweep(after(3.5));
    expect(sent).toHaveLength(1);

    const done = parseProgress({});
    for (const step of ['account', 'services', 'hours', 'simulator'] as const)
      markStep(done, { step, status: 'done', now: CREATED });
    markStep(done, { step: 'whatsapp', status: 'skipped', now: CREATED });
    markStep(done, { step: 'activation', status: 'done', now: CREATED });
    const finished = await setup(done);
    await finished.sweep(after(10));
    expect(finished.sent).toHaveLength(0);
  });

  it('releases the claim when the send fails, so the next sweep retries', async () => {
    const { tenantId, sweep, row } = await setup();
    const failing = await sweepTrials({
      db,
      now: after(1),
      urls: URLS,
      onlyTenantId: tenantId,
      email: { send: () => Promise.reject(new Error('smtp down')) },
      alert: () => undefined,
    });
    expect(failing.reminded).toBe(0);
    expect((await row()).reminder1dSentAt).toBeNull();
    expect((await sweep(after(1))).reminded).toBe(1);
  });
});

describe('end of trial (RF-88)', () => {
  it('turns the assistant off, keeps the data, notifies the owner once', async () => {
    const { tenantId, email, sent, sweep, row } = await setup();
    await db.client.tenant.update({ where: { id: tenantId }, data: { autonomy: 'auto' } });
    const first = await sweep(after(14));
    expect(first.ended).toBe(1);
    const tenant = await row();
    expect(tenant).toMatchObject({ autonomy: 'off', status: 'restricted' });
    expect(tenant.trialEndedAt).toEqual(after(14));
    expect(sent.filter((m) => m.to === email && m.subject.includes('terminou'))).toHaveLength(1);
    expect(sent.at(-1)?.text).toContain('30 dias');
    expect((await sweep(after(15))).ended).toBe(0);
    expect(sent.filter((m) => m.subject.includes('terminou'))).toHaveLength(1);
  });

  it('does not touch a tenant that subscribed or has no trial date', async () => {
    const paid = await setup();
    await db.client.tenant.update({ where: { id: paid.tenantId }, data: { status: 'active' } });
    expect((await paid.sweep(after(20))).ended).toBe(0);
    const pilot = await setup();
    await db.client.tenant.update({ where: { id: pilot.tenantId }, data: { trialEndsAt: null } });
    expect((await pilot.sweep(after(99))).ended).toBe(0);
    expect((await pilot.row()).autonomy).not.toBe('off');
  });

  it('never ends an invited consultório still in setup, but reminds it (H-24)', async () => {
    const invited = await setup();
    await db.client.tenant.update({
      where: { id: invited.tenantId },
      data: { status: 'setup', trialEndsAt: null },
    });
    expect(await invited.sweep(after(99))).toEqual({ ended: 0, reminded: 1 });
    expect((await invited.row()).status).toBe('setup');
  });
});

describe('conversation cap during the trial (RF-81)', () => {
  const seed = (tenantId: string, conversations: number) =>
    db.withTenant(tenantId, (tx) =>
      tx.usageCounter.create({
        data: { tenantId, month: monthOf(new Date()), conversations },
      }),
    );

  it('goes restricted at the cap, but only while on trial', async () => {
    const { tenantId } = await setup();
    await seed(tenantId, TRIAL_CONVERSATION_CAP - 1);
    expect(await db.withTenant(tenantId, (tx) => isRestricted(tx, tenantId))).toBe(false);
    await db.withTenant(tenantId, (tx) =>
      tx.usageCounter.updateMany({ data: { conversations: TRIAL_CONVERSATION_CAP } }),
    );
    expect(await db.withTenant(tenantId, (tx) => isRestricted(tx, tenantId))).toBe(true);
    await db.client.tenant.update({ where: { id: tenantId }, data: { status: 'active' } });
    expect(await db.withTenant(tenantId, (tx) => isRestricted(tx, tenantId))).toBe(false);
  });
});
