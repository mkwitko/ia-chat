import {
  ConversationControl,
  MessageAuthor,
  lockConversation,
  recordOutbound,
  turnMayDeliver,
  TurnState,
  type Db,
  type Tx,
} from '@app/db';
import { AlertEvent } from '@app/observability';
import { handOff } from './handoff.ts';
import { NotifyReason } from '../notify/reasons.ts';

import { realClock } from './clock.ts';
import { pacedDelayMs } from './pacing.ts';
import { mediaPending, turnMessage, unansweredMessages } from './turn-media.ts';
import { isRestricted, restrictedReply } from './restricted.ts';
import { generateInTime } from './timing.ts';
import {
  BUSY_MESSAGE,
  DeliveryMode,
  TurnOutcome,
  type TurnDeps,
  type TurnJob,
  ReminderKind,
  type TurnReply,
  type Claimed,
} from './turn-types.ts';

export * from './turn-types.ts';

const NO_MODEL = 'none';

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
    const generated = claimed.restricted
      ? { aborted: false as const, reply: restrictedReply() }
      : await generateInTime(deps, { ...job, ...claimed });
    if (generated.aborted) return await abortTurn(db, { job, turnId: claimed.turnId, deps });
    const { reply } = generated;
    // E-15: a plausible delay, counting the time already spent generating.
    if (reply?.mode === DeliveryMode.send)
      await clock.sleep(pacedDelayMs(reply.text, clock.now() - started));
    const outcome = await db.withTenant(job.tenantId, (tx) =>
      deliver(tx, { job, turnId: claimed.turnId, reply, deps }),
    );
    await notifyProfessional({ job, turnId: claimed.turnId, outcome, reply, deps });
    return outcome;
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
  deps.alert?.(AlertEvent.turnAborted, {
    tenantId: job.tenantId,
    conversationId: job.conversationId,
    turnId,
  });
  deps.notify?.({
    tenantId: job.tenantId,
    conversationId: job.conversationId,
    reason: NotifyReason.turnTimeout,
  });
  return TurnOutcome.aborted;
}

/** After the commit, so a notice never announces an answer that was discarded. */
async function notifyProfessional(input: {
  job: TurnJob;
  turnId: string;
  outcome: TurnOutcome;
  reply: TurnReply | null;
  deps: TurnDeps;
}): Promise<void> {
  const { job, turnId, outcome, reply, deps } = input;
  const reason = noticeReason(outcome, reply);
  if (!reason) return;
  const { tenantId, conversationId } = job;
  deps.notify?.({ tenantId, conversationId, reason });
  // Nobody answers a handoff or approves a draft: the reminder jobs ask again later.
  const kind = reason === NotifyReason.draftPending ? ReminderKind.draft : ReminderKind.handoff;
  await deps.scheduleReminder?.({ tenantId, conversationId, turnId, kind });
}

function noticeReason(outcome: TurnOutcome, reply: TurnReply | null): NotifyReason | null {
  if (outcome === TurnOutcome.draft) return NotifyReason.draftPending;
  if (outcome !== TurnOutcome.sent || !reply?.handoff) return null;
  return reply.urgent ? NotifyReason.urgency : NotifyReason.handoff;
}

async function claim(tx: Tx, job: TurnJob): Promise<Claimed | null> {
  const conversation = await tx.conversation.findUnique({ where: { id: job.conversationId } });
  if (
    conversation?.control !== ConversationControl.ai ||
    conversation.turnVersion !== job.version ||
    !conversation.pendingSince
  )
    return null;
  const messages = await unansweredMessages(tx, job.conversationId, conversation.pendingSince);
  // E-10: the media job asks for a new turn when the transcript (or the failure) is in.
  if (mediaPending(messages, new Date())) return null;
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
    messages: messages.map(turnMessage),
    lastProviderMessageId: messages.at(-1)?.providerMessageId ?? null,
    restricted: await isRestricted(tx, job.tenantId),
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
  const locked = await lockConversation(tx, job.conversationId);
  if (!turnMayDeliver(locked, job.version)) {
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
  for (const text of reply.followUp ? [reply.text, reply.followUp] : [reply.text]) {
    const { providerMessageId } = await deps.send(tx, { conversationId: job.conversationId, text });
    await recordOutbound(tx, {
      tenantId: job.tenantId,
      conversationId: job.conversationId,
      author: MessageAuthor.ai,
      text,
      providerMessageId,
    });
  }
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
