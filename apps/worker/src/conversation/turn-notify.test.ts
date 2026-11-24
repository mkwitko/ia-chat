import { randomUUID } from 'node:crypto';
import { ContentType, InboundKind } from '@app/channels';
import { ActorType, ControlReason, ConversationControl, createDb, setControl } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { applyInboundEvents } from '../inbound/apply.ts';
import { NotifyReason } from '../notify/reasons.ts';
import { createFakeClock } from './clock.ts';
import { DeliveryMode, ReminderKind, runTurn, type TurnDeps, type TurnReply } from './turn.ts';

// E-16: the professional is told (after the commit) when the assistant hands off, answers an
// emergency or leaves a draft; a discarded turn tells nothing.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

async function pendingTurn() {
  const tenant = await db.client.tenant.create({
    data: { name: 'Aviso (fictício)', slug: `ntf-${randomUUID()}` },
  });
  const tenantId = tenant.id;
  const channel = await db.withTenant(tenantId, (tx) =>
    tx.channel.create({ data: { tenantId, kind: 'cloud_api' } }),
  );
  const { turns } = await db.withTenant(tenantId, (tx) =>
    applyInboundEvents(tx, {
      tenantId,
      channelId: channel.id,
      events: [
        {
          kind: InboundKind.message,
          providerMessageId: `wamid.${randomUUID()}`,
          contact: { bsuid: `BR.${randomUUID()}` },
          at: new Date(),
          content: { type: ContentType.text, text: 'oi' },
        },
      ],
    }),
  );
  const [request] = turns;
  if (!request) throw new Error('no turn');
  return { tenantId, request };
}

const reply = (change: Partial<TurnReply>): TurnReply => ({
  text: 'resposta',
  model: 'fake',
  costMicroUsd: 0n,
  mode: DeliveryMode.send,
  handoff: false,
  ...change,
});

function harness(answer: TurnReply, during: () => Promise<unknown> = () => Promise.resolve()) {
  const clock = createFakeClock(Date.parse('2027-01-04T12:00:00Z'));
  const notified: NotifyReason[] = [];
  const reminders: ReminderKind[] = [];
  const deps: TurnDeps = {
    respond: async () => {
      await during();
      return answer;
    },
    send: () => Promise.resolve({ providerMessageId: `wamid.out.${randomUUID()}` }),
    notify: ({ reason }) => notified.push(reason),
    scheduleReminder: ({ kind }) => {
      reminders.push(kind);
      return Promise.resolve();
    },
    clock,
  };
  return { deps, clock, notified, reminders };
}

const POLL_MS = 10;
const PACING_STEP_MS = 1000;

type During = (tenantId: string, id: string) => Promise<unknown>;

async function run(answer: TurnReply, during: During = () => Promise.resolve()) {
  const { tenantId, request } = await pendingTurn();
  const { conversationId } = request;
  const h = harness(answer, () => during(tenantId, conversationId));
  const state = { done: false };
  const running = runTurn(db, { tenantId, ...request }, h.deps).finally(() => {
    state.done = true;
  });
  // The fake clock only moves when told: small steps, so the 45 s abort never fires first.
  while (!state.done) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    await h.clock.advance(PACING_STEP_MS);
  }
  await running;
  return { notified: h.notified, reminders: h.reminders };
}

describe('notifying the professional', () => {
  it('an emergency answer notifies as urgency and schedules the handoff reminder', async () => {
    const { notified, reminders } = await run(reply({ handoff: true, urgent: true }));
    expect(notified).toEqual([NotifyReason.urgency]);
    expect(reminders).toEqual([ReminderKind.handoff]);
  });

  it('a handoff notifies as handoff', async () => {
    const { notified } = await run(reply({ handoff: true }));
    expect(notified).toEqual([NotifyReason.handoff]);
  });

  it('a draft notifies and schedules the draft reminder', async () => {
    const { notified, reminders } = await run(reply({ mode: DeliveryMode.draft }));
    expect(notified).toEqual([NotifyReason.draftPending]);
    expect(reminders).toEqual([ReminderKind.draft]);
  });

  it('a plain answer notifies nobody', async () => {
    const { notified } = await run(reply({}));
    expect(notified).toEqual([]);
  });

  it('a discarded turn notifies nobody (the lock refused the answer)', async () => {
    const { notified } = await run(reply({ handoff: true }), (tenantId, conversationId) =>
      db.withTenant(tenantId, (tx) =>
        setControl(tx, {
          tenantId,
          conversationId,
          to: ConversationControl.human,
          reason: ControlReason.dashboard,
          actor: { type: ActorType.system },
        }),
      ),
    );
    expect(notified).toEqual([]);
  });
});
