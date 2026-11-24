import { randomUUID } from 'node:crypto';
import { ContentType, InboundKind } from '@app/channels';
import { createDb, MessageAuthor } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { applyInboundEvents } from '../inbound/apply.ts';
import { createFakeClock } from './clock.ts';
import {
  BUSY_MESSAGE,
  DeliveryMode,
  runTurn,
  TurnOutcome,
  type TurnDeps,
  type TurnReply,
} from './turn.ts';

// E-15 on a fake clock: no real waiting, deterministic timings.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

async function pendingTurn() {
  const tenant = await db.client.tenant.create({
    data: { name: 'Entrega (fictício)', slug: `del-${randomUUID()}` },
  });
  const tenantId = tenant.id;
  const channel = await db.withTenant(tenantId, (tx) =>
    tx.channel.create({ data: { tenantId, kind: 'cloud_api' } }),
  );
  const providerMessageId = `wamid.${randomUUID()}`;
  const { turns } = await db.withTenant(tenantId, (tx) =>
    applyInboundEvents(tx, {
      tenantId,
      channelId: channel.id,
      events: [
        {
          kind: InboundKind.message,
          providerMessageId,
          contact: { bsuid: `BR.${randomUUID()}` },
          at: new Date(),
          content: { type: ContentType.text, text: 'oi' },
        },
      ],
    }),
  );
  const [request] = turns;
  if (!request) throw new Error('no turn');
  return { tenantId, request, providerMessageId };
}

const reply = (text: string): TurnReply => ({
  text,
  model: 'fake',
  costMicroUsd: 0n,
  mode: DeliveryMode.send,
  handoff: false,
});

function harness(respond: TurnDeps['respond']) {
  const clock = createFakeClock(Date.parse('2027-01-04T12:00:00Z'));
  const sent: string[] = [];
  const typing: string[] = [];
  const notified: string[] = [];
  const deps: TurnDeps = {
    respond,
    send: (_tx, { text }) => {
      sent.push(text);
      return Promise.resolve({ providerMessageId: `wamid.out.${randomUUID()}` });
    },
    typing: ({ providerMessageId }) => {
      typing.push(providerMessageId);
      return Promise.resolve();
    },
    notify: ({ reason }) => notified.push(reason),
    clock,
  };
  return { clock, sent, typing, notified, deps };
}

/** Real-time wait for the turn to reach a point (DB work is real, timers are fake). */
async function until(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 200 && !check(); attempt += 1)
    await new Promise((resolve) => setTimeout(resolve, 10));
}

describe('natural delivery (E-15)', () => {
  it('marks read with typing, then waits the target minus processing before sending', async () => {
    const { tenantId, request, providerMessageId } = await pendingTurn();
    const text = 'a'.repeat(80); // 3.5 s target
    let answer: ((value: TurnReply) => void) | undefined;
    const h = harness(() => new Promise((resolve) => (answer = resolve)));
    const running = runTurn(db, { tenantId, ...request }, h.deps);
    await until(() => h.typing.length > 0);
    expect(h.typing).toEqual([providerMessageId]);
    await h.clock.advance(1000); // 1 s of "processing"
    answer?.(reply(text));
    await until(() => h.sent.length > 0 || false);
    await h.clock.advance(2400);
    expect(h.sent).toEqual([]);
    await h.clock.advance(100);
    expect(await running).toBe(TurnOutcome.sent);
    expect(h.sent).toEqual([text]);
  });

  it('sends typing again at 20 s while the answer is still being generated', async () => {
    const { tenantId, request } = await pendingTurn();
    let answer: ((value: TurnReply) => void) | undefined;
    const h = harness(() => new Promise((resolve) => (answer = resolve)));
    const running = runTurn(db, { tenantId, ...request }, h.deps);
    await until(() => h.typing.length > 0);
    await h.clock.advance(20_000);
    expect(h.typing).toHaveLength(2);
    answer?.(reply('ok'));
    await until(() => false);
    await h.clock.advance(1);
    expect(await running).toBe(TurnOutcome.sent);
  });

  it('aborts at 45 s with the fixed message, notifies, and ignores the late answer', async () => {
    const { tenantId, request } = await pendingTurn();
    let answer: ((value: TurnReply) => void) | undefined;
    const h = harness(() => new Promise((resolve) => (answer = resolve)));
    const running = runTurn(db, { tenantId, ...request }, h.deps);
    await until(() => h.typing.length > 0);
    await h.clock.advance(45_000);
    expect(await running).toBe(TurnOutcome.aborted);
    expect(h.sent).toEqual([BUSY_MESSAGE]);
    expect(h.notified).toHaveLength(1);
    answer?.(reply('tarde demais'));
    await h.clock.advance(10_000);
    expect(h.sent).toEqual([BUSY_MESSAGE]);
    const authors = await db.withTenant(tenantId, (tx) =>
      tx.message.findMany({ where: { author: MessageAuthor.ai }, select: { text: true } }),
    );
    expect(authors).toEqual([{ text: BUSY_MESSAGE }]);
  });
});
