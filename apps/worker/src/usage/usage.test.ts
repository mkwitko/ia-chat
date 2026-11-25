import { randomUUID } from 'node:crypto';
import { ContentType, InboundKind, type InboundEvent } from '@app/channels';
import { monthOf } from '@app/core';
import { createDb, MessageAuthor, TurnState } from '@app/db';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { runTurn, DeliveryMode, TurnOutcome, type TurnDeps } from '../conversation/turn.ts';
import { RESTRICTED_MESSAGE } from '../conversation/restricted.ts';
import { applyInboundEvents } from '../inbound/apply.ts';
import { NotifyReason } from '../notify/reasons.ts';

// E-18: conversations per month, 80% and 100% warnings, overage cap and restricted mode.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

const HOUR_MS = 3_600_000;
const FRANCHISE = 300; // plan essencial
let clock = Date.parse('2027-01-04T12:00:00Z');
const tick = (ms = 1000) => {
  clock += ms;
  return new Date(clock);
};

async function setup(overageCapCents: number | null = null) {
  const tenant = await db.client.tenant.create({
    data: {
      name: 'Uso (fictício)',
      slug: `use-${randomUUID()}`,
      overageCapCents,
      status: 'active', // paying: the trial has its own cap (S-05)
    },
  });
  const tenantId = tenant.id;
  const channel = await db.withTenant(tenantId, (tx) =>
    tx.channel.create({ data: { tenantId, kind: 'cloud_api' } }),
  );
  const patient = async (contact: string, at: Date) => {
    const event: InboundEvent = {
      kind: InboundKind.message,
      providerMessageId: `wamid.${randomUUID()}`,
      contact: { bsuid: contact },
      at,
      content: { type: ContentType.text, text: 'oi' },
    };
    return db.withTenant(tenantId, (tx) =>
      applyInboundEvents(tx, { tenantId, channelId: channel.id, events: [event] }),
    );
  };
  const seed = (conversations: number) =>
    db.withTenant(tenantId, (tx) =>
      tx.usageCounter.upsert({
        where: { tenantId_month: { tenantId, month: monthOf(new Date()) } },
        create: { tenantId, month: monthOf(new Date()), conversations },
        update: { conversations },
      }),
    );
  const counter = () =>
    db.withTenant(tenantId, (tx) =>
      tx.usageCounter.findFirstOrThrow({ where: { month: monthOf(new Date()) } }),
    );
  return { tenantId, patient, seed, counter };
}

describe('conversation counting', () => {
  it('counts one conversation until a gap over 24 h, and messages by category', async () => {
    const { patient, counter } = await setup();
    await patient('BR.A', tick());
    await patient('BR.A', tick(23 * HOUR_MS));
    expect((await counter()).conversations).toBe(1);
    await patient('BR.A', tick(25 * HOUR_MS));
    await patient('BR.B', tick());
    const row = await counter();
    expect(row.conversations).toBe(3);
    expect(row.messagesByCategory).toEqual({ patient: 4 });
  });
});

describe('warnings', () => {
  it('pushes 80% once, then 100% once, per month', async () => {
    const { patient, seed, counter } = await setup();
    await seed(FRANCHISE * 0.8 - 1);
    const first = await patient('BR.C', tick());
    expect(first.usage.map((notice) => notice.reason)).toEqual([NotifyReason.usageWarning]);
    expect((await patient('BR.D', tick())).usage).toEqual([]);
    await seed(FRANCHISE - 1);
    const full = await patient('BR.E', tick());
    expect(full.usage.map((notice) => notice.reason)).toEqual([NotifyReason.usageFull]);
    expect((await patient('BR.F', tick())).usage).toEqual([]);
    const row = await counter();
    expect(row.warned80At).not.toBeNull();
    expect(row.warned100At).not.toBeNull();
  });

  it('keeps counting above 100% (overage) without restricting', async () => {
    const { patient, seed, counter } = await setup();
    await seed(FRANCHISE + 10);
    await patient('BR.G', tick());
    expect((await counter()).conversations).toBe(FRANCHISE + 11);
  });
});

function spyDeps() {
  const respond = vi.fn<TurnDeps['respond']>();
  const sent: string[] = [];
  const notify = vi.fn<NonNullable<TurnDeps['notify']>>();
  const deps: TurnDeps = {
    respond,
    notify,
    send: (_tx, { text }) => {
      sent.push(text);
      return Promise.resolve({ providerMessageId: `wamid.out.${randomUUID()}` });
    },
  };
  return { deps, respond, sent, notify };
}

describe('restricted mode', () => {
  const answerWith = async (cap: number | null, conversations: number) => {
    const { tenantId, patient, seed } = await setup(cap);
    await seed(conversations);
    const [request] = (await patient('BR.H', tick())).turns;
    if (!request) throw new Error('expected a turn request');
    const spy = spyDeps();
    const outcome = await runTurn(db, { tenantId, ...request }, spy.deps);
    return { tenantId, outcome, ...spy };
  };

  it('sends the fixed message and notifies without calling the model past the cap', async () => {
    // 300 + 51 conversations = R$ 20,40 of overage, over the R$ 20,00 cap.
    const run = await answerWith(2000, FRANCHISE + 50);
    expect(run.outcome).toBe(TurnOutcome.sent);
    expect(run.respond).not.toHaveBeenCalled();
    expect(run.sent).toEqual([RESTRICTED_MESSAGE]);
    expect(run.notify).toHaveBeenCalledWith(
      expect.objectContaining({ reason: NotifyReason.handoff }),
    );
    const turn = await db.withTenant(run.tenantId, (tx) => tx.turn.findFirstOrThrow());
    expect(turn.state).toBe(TurnState.sent);
    const ai = await db.withTenant(run.tenantId, (tx) =>
      tx.message.count({ where: { author: MessageAuthor.ai } }),
    );
    expect(ai).toBe(1);
  });

  it.each([
    ['no cap', null, FRANCHISE + 500],
    ['overage still under the cap', 2000, FRANCHISE + 20],
  ])('keeps answering normally: %s', async (_name, cap, conversations) => {
    const { tenantId, patient, seed } = await setup(cap);
    await seed(conversations);
    const [request] = (await patient('BR.I', tick())).turns;
    if (!request) throw new Error('expected a turn request');
    const spy = spyDeps();
    spy.respond.mockResolvedValue({
      text: 'ok',
      model: 'fake',
      costMicroUsd: 0n,
      mode: DeliveryMode.send,
      handoff: false,
    });
    await runTurn(db, { tenantId, ...request }, spy.deps);
    expect(spy.respond).toHaveBeenCalledTimes(1);
    expect(spy.sent).toEqual(['ok']);
  });
});
