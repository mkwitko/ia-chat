import { randomUUID } from 'node:crypto';
import { ContentType, InboundKind, type InboundEvent } from '@app/channels';
import {
  ActorType,
  ControlReason,
  ConversationControl,
  createDb,
  MessageAuthor,
  MessageDirection,
  ScheduledMessageKind,
  ScheduledMessageState,
  setControl,
  TurnState,
} from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { applyInboundEvents } from '../inbound/apply.ts';
import { handOff, needsHandoffReminder } from './handoff.ts';
import { turnDelayMs, type TurnRequest } from './schedule.ts';
import { runTurn, TurnOutcome, type TurnDeps } from './turn.ts';

// E-11 (A-02, A-03) and E-12 (A-04, A-05, A-06, RF-30, RF-31, RF-35, RF-36), with a fake
// assistant: no model is called in these tests.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

let clock = Date.parse('2027-01-04T12:00:00Z');
const tick = () => {
  clock += 1000;
  return new Date(clock);
};

async function setup() {
  const tenant = await db.client.tenant.create({
    data: { name: 'Turnos (fictício)', slug: `turn-${randomUUID()}` },
  });
  const tenantId = tenant.id;
  const channel = await db.withTenant(tenantId, (tx) =>
    tx.channel.create({ data: { tenantId, kind: 'cloud_api' } }),
  );
  const contact = { bsuid: `BR.${randomUUID()}` };
  const apply = async (event: InboundEvent) => {
    const { turns } = await db.withTenant(tenantId, (tx) =>
      applyInboundEvents(tx, { tenantId, channelId: channel.id, events: [event] }),
    );
    return turns;
  };
  const patient = (text: string) =>
    apply({
      kind: InboundKind.message,
      providerMessageId: `wamid.${randomUUID()}`,
      contact,
      at: tick(),
      content: { type: ContentType.text, text },
    });
  const echo = (text: string) =>
    apply({
      kind: InboundKind.ownerEcho,
      providerMessageId: `wamid.${randomUUID()}`,
      contact,
      at: tick(),
      content: { type: ContentType.text, text },
    });
  const conversation = () => db.withTenant(tenantId, (tx) => tx.conversation.findFirstOrThrow());
  return { tenantId, patient, echo, conversation };
}

/** Fake assistant: records what it was asked and answers "ok"; `during` runs mid-generation. */
function fakeAssistant(during: () => Promise<unknown> = () => Promise.resolve()) {
  const seen: string[][] = [];
  const sent: string[] = [];
  const deps: TurnDeps = {
    respond: async ({ messages }) => {
      seen.push(messages.map((message) => message.text ?? ''));
      await during();
      return { text: 'ok', model: 'fake', costMicroUsd: 0n };
    },
    send: (_tx, { text }) => {
      sent.push(text);
      return Promise.resolve({ providerMessageId: `wamid.out.${randomUUID()}` });
    },
  };
  return { deps, seen, sent };
}

const run = (tenantId: string, request: TurnRequest | undefined, deps: TurnDeps) => {
  if (!request) throw new Error('expected a turn request');
  return runTurn(db, { tenantId, ...request }, deps);
};

describe('grouping (E-11)', () => {
  it('waits 6 s after each message, never past 20 s from the first', () => {
    const first = new Date('2027-01-04T12:00:00Z');
    expect(turnDelayMs(first, first)).toBe(6000);
    expect(turnDelayMs(new Date(first.getTime() + 15_000), first)).toBe(5000);
    expect(turnDelayMs(new Date(first.getTime() + 25_000), first)).toBe(0);
  });

  it('answers three quick messages once, considering all three (A-02)', async () => {
    const { tenantId, patient } = await setup();
    const requests = [
      ...(await patient('oi')),
      ...(await patient('quanto custa')),
      ...(await patient('a avaliação?')),
    ];
    const assistant = fakeAssistant();
    const outcomes = [];
    for (const request of requests) outcomes.push(await run(tenantId, request, assistant.deps));
    expect(outcomes).toEqual([TurnOutcome.stale, TurnOutcome.stale, TurnOutcome.sent]);
    expect(assistant.seen).toEqual([['oi', 'quanto custa', 'a avaliação?']]);
    await db.withTenant(tenantId, async (tx) => {
      const turn = await tx.turn.findFirstOrThrow();
      expect(turn).toMatchObject({ state: TurnState.sent, model: 'fake' });
      expect(turn.messageIds).toHaveLength(3);
      expect(await tx.message.count({ where: { author: MessageAuthor.ai } })).toBe(1);
    });
  });

  it('discards the answer when the patient writes during generation, then answers everything (A-03)', async () => {
    const { tenantId, patient } = await setup();
    const [first] = await patient('tem horário amanhã?');
    let next: TurnRequest[] = [];
    const assistant = fakeAssistant(async () => {
      next = await patient('de manhã');
    });
    expect(await run(tenantId, first, assistant.deps)).toBe(TurnOutcome.discarded);
    expect(assistant.sent).toEqual([]);
    const retry = fakeAssistant();
    expect(await run(tenantId, next[0], retry.deps)).toBe(TurnOutcome.sent);
    expect(retry.seen).toEqual([['tem horário amanhã?', 'de manhã']]);
  });
});

describe('human control (E-12)', () => {
  it('owner reply during generation: nothing from the assistant goes out after it (A-04, RF-30)', async () => {
    const { tenantId, patient, echo, conversation } = await setup();
    const [request] = await patient('preciso falar com o doutor');
    const assistant = fakeAssistant(() => echo('Oi, aqui é o Rafael.'));
    expect(await run(tenantId, request, assistant.deps)).toBe(TurnOutcome.discarded);
    expect(assistant.sent).toEqual([]);
    expect(await conversation()).toMatchObject({
      control: ConversationControl.human,
      controlReason: ControlReason.ownerEcho,
    });
    const audit = await db.withTenant(tenantId, (tx) => tx.auditLog.findMany());
    expect(audit).toHaveLength(1);
  });

  it('ten patient messages in human control call no model (A-05)', async () => {
    const { tenantId, patient, echo } = await setup();
    await patient('oi');
    await echo('pode falar');
    const requests: TurnRequest[] = [];
    for (let index = 0; index < 10; index += 1)
      requests.push(...(await patient(`mensagem ${String(index)}`)));
    expect(requests).toEqual([]);
    const conversationTurns = await db.withTenant(tenantId, (tx) => tx.turn.count());
    expect(conversationTurns).toBe(0);
  });

  it('back with the assistant, it answers only the next message (A-06)', async () => {
    const { tenantId, patient, echo, conversation } = await setup();
    const [old] = await patient('mensagem antiga');
    await echo('assumi');
    await patient('mensagem durante o humano');
    const { id } = await conversation();
    await db.withTenant(tenantId, (tx) =>
      setControl(tx, {
        tenantId,
        conversationId: id,
        to: ConversationControl.ai,
        reason: ControlReason.dashboard,
        actor: { type: ActorType.user },
      }),
    );
    const assistant = fakeAssistant();
    expect(await run(tenantId, old, assistant.deps)).toBe(TurnOutcome.stale);
    const [next] = await patient('e agora?');
    expect(await run(tenantId, next, assistant.deps)).toBe(TurnOutcome.sent);
    expect(assistant.seen).toEqual([['e agora?']]);
  });

  it('stops follow-ups but keeps appointment reminders when the human takes over (RF-31)', async () => {
    const { tenantId, patient, echo, conversation } = await setup();
    await patient('oi');
    const { id, contactId } = await conversation();
    await db.withTenant(tenantId, (tx) =>
      tx.scheduledMessage.createMany({
        data: [ScheduledMessageKind.follow_up, ScheduledMessageKind.reminder].map((kind) => ({
          tenantId,
          contactId,
          conversationId: id,
          kind,
          sendAt: new Date('2027-01-05T12:00:00Z'),
        })),
      }),
    );
    await echo('assumi');
    const states = await db.withTenant(tenantId, (tx) =>
      tx.scheduledMessage.findMany({ orderBy: { kind: 'asc' } }),
    );
    expect(states.map((message) => [message.kind, message.state])).toEqual([
      [ScheduledMessageKind.reminder, ScheduledMessageState.scheduled],
      [ScheduledMessageKind.follow_up, ScheduledMessageState.cancelled],
    ]);
  });

  it('hands off to the professional and reminds while nobody answers (RF-35, RF-36)', async () => {
    const { tenantId, patient, conversation } = await setup();
    await patient('quero falar com uma pessoa');
    const { id } = await conversation();
    const handoff = await db.withTenant(tenantId, (tx) =>
      handOff(tx, { tenantId, conversationId: id }),
    );
    expect(handoff.notice).toContain('responder');
    expect(await conversation()).toMatchObject({
      control: ConversationControl.human,
      controlReason: ControlReason.agentHandoff,
    });
    expect(await db.withTenant(tenantId, (tx) => needsHandoffReminder(tx, id))).toBe(true);
    await db.withTenant(tenantId, (tx) =>
      tx.message.create({
        data: {
          tenantId,
          channelId: handoff.channelId,
          conversationId: id,
          direction: MessageDirection.outbound,
          author: MessageAuthor.human,
          type: ContentType.text,
          text: 'oi',
          status: 'sent',
        },
      }),
    );
    expect(await db.withTenant(tenantId, (tx) => needsHandoffReminder(tx, id))).toBe(false);
  });
});
