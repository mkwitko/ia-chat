import {
  ConversationControl,
  MessageAuthor,
  MessageDirection,
  MessageStatus,
  MessageType,
  Prisma,
  TurnState,
  type Db,
  type Tx,
} from '@app/db';
import { handOff } from './handoff.ts';

import { realClock } from './clock.ts';
import { pacedDelayMs } from './pacing.ts';
import { generateInTime } from './timing.ts';
import {
  BUSY_MESSAGE,
  DeliveryMode,
  TurnOutcome,
  type TurnDeps,
  type TurnJob,
  type TurnMessage,
  type TurnReply,
} from './turn-types.ts';

export * from './turn-types.ts';

const NO_MODEL = 'none';
const ABORT_REASON = 'turn_timeout';

/**
 * One turn (spec 03, "Execução do turno"): claim the pending messages, generate outside
 * any transaction, then deliver under the lock only if nothing changed meanwhile.
 */
export async function runTurn(db: Db, job: TurnJob, deps: TurnDeps): Promise<TurnOutcome> {
  const claimed = await db.withTenant(job.tenantId, (tx) => claim(tx, job));
  if (!claimed) return TurnOutcome.stale;
  const clock = deps.clock ?? realClock;
  const started = clock.now();
  try {
    const generated = await generateInTime(deps, { ...job, ...claimed });
    if (generated.aborted) return await abortTurn(db, { job, turnId: claimed.turnId, deps });
    const { reply } = generated;
    // E-15: a plausible delay, counting the time already spent generating.
    if (reply?.mode === DeliveryMode.send)
      await clock.sleep(pacedDelayMs(reply.text, clock.now() - started));
    return await db.withTenant(job.tenantId, (tx) =>
      deliver(tx, { job, turnId: claimed.turnId, reply, deps }),
    );
  } catch (error) {
    await db.withTenant(job.tenantId, (tx) =>
      finish(tx, claimed.turnId, { state: TurnState.failed }),
    );
    throw error;
  }
}

/** Past 45 s: tell the patient to hold on, notify the professional, keep the turn as failed. */
async function abortTurn(
  db: Db,
  { job, turnId, deps }: { job: TurnJob; turnId: string; deps: TurnDeps },
): Promise<TurnOutcome> {
  const busy: TurnReply = {
    text: BUSY_MESSAGE,
    model: NO_MODEL,
    costMicroUsd: 0n,
    mode: DeliveryMode.send,
    handoff: false,
  };
  await db.withTenant(job.tenantId, async (tx) => {
    await deliver(tx, { job, turnId, reply: busy, deps });
    await finish(tx, turnId, { state: TurnState.failed });
  });
  deps.notify?.({
    tenantId: job.tenantId,
    conversationId: job.conversationId,
    reason: ABORT_REASON,
  });
  return TurnOutcome.aborted;
}

async function claim(
  tx: Tx,
  job: TurnJob,
): Promise<{
  turnId: string;
  messages: TurnMessage[];
  lastProviderMessageId: string | null;
} | null> {
  const conversation = await tx.conversation.findUnique({ where: { id: job.conversationId } });
  if (
    conversation?.control !== ConversationControl.ai ||
    conversation.turnVersion !== job.version ||
    !conversation.pendingSince
  )
    return null;
  // Everything unanswered since pendingSince, including messages of a discarded turn (A-03).
  const messages = await tx.message.findMany({
    where: {
      conversationId: job.conversationId,
      author: MessageAuthor.patient,
      createdAt: { gte: conversation.pendingSince },
    },
    orderBy: [{ providerTimestamp: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, type: true, text: true, providerMessageId: true },
  });
  const turn = await tx.turn.create({
    data: {
      tenantId: job.tenantId,
      conversationId: job.conversationId,
      version: job.version,
      messageIds: messages.map((message) => message.id),
      state: TurnState.running,
    },
  });
  return {
    turnId: turn.id,
    messages: messages.map(({ id, type, text }) => ({ id, type, text })),
    lastProviderMessageId: messages.at(-1)?.providerMessageId ?? null,
  };
}

interface Delivery {
  job: TurnJob;
  turnId: string;
  reply: TurnReply | null;
  deps: TurnDeps;
}

/** Send lock (spec 03, "Trava de envio"): control 'ai' and the same turn_version, row locked. */
async function deliver(tx: Tx, { job, turnId, reply, deps }: Delivery): Promise<TurnOutcome> {
  const [locked] = await tx.$queryRaw<{ control: ConversationControl; turn_version: number }[]>(
    Prisma.sql`select control, turn_version from conversations where id = ${job.conversationId}::uuid for update`,
  );
  if (locked?.control !== ConversationControl.ai || locked.turn_version !== job.version) {
    await finish(tx, turnId, { state: TurnState.discarded, reply });
    return TurnOutcome.discarded;
  }
  if (!reply) {
    await tx.conversation.update({
      where: { id: job.conversationId },
      data: { pendingSince: null },
    });
    await finish(tx, turnId, { state: TurnState.discarded });
    return TurnOutcome.skipped;
  }
  if (reply.mode === DeliveryMode.draft) {
    await finish(tx, turnId, { state: TurnState.draft, reply, draftText: reply.text });
    return TurnOutcome.draft;
  }
  await sendReply(tx, { job, reply, deps });
  if (reply.handoff)
    await handOff(tx, { tenantId: job.tenantId, conversationId: job.conversationId });
  await finish(tx, turnId, { state: TurnState.sent, reply });
  return TurnOutcome.sent;
}

async function sendReply(
  tx: Tx,
  { job, reply, deps }: { job: TurnJob; reply: TurnReply; deps: TurnDeps },
): Promise<void> {
  const { providerMessageId } = await deps.send(tx, {
    conversationId: job.conversationId,
    text: reply.text,
  });
  const conversation = await tx.conversation.update({
    where: { id: job.conversationId },
    data: { pendingSince: null, unreadCount: 0, lastMessageAt: new Date() },
  });
  await tx.message.create({
    data: {
      tenantId: job.tenantId,
      channelId: conversation.channelId,
      conversationId: job.conversationId,
      direction: MessageDirection.outbound,
      author: MessageAuthor.ai,
      type: MessageType.text,
      text: reply.text,
      providerMessageId,
      providerTimestamp: new Date(),
      status: MessageStatus.sent,
    },
  });
}

interface Finish {
  state: TurnState;
  reply?: TurnReply | null;
  draftText?: string;
}

async function finish(tx: Tx, turnId: string, { state, reply, draftText }: Finish): Promise<void> {
  await tx.turn.update({
    where: { id: turnId },
    data: {
      state,
      finishedAt: new Date(),
      draftText: draftText ?? null,
      ...(reply ? { model: reply.model, costMicroUsd: reply.costMicroUsd } : {}),
    },
  });
}
