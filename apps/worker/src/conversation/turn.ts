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

export const TurnOutcome = {
  stale: 'stale',
  sent: 'sent',
  discarded: 'discarded',
} as const;
export type TurnOutcome = (typeof TurnOutcome)[keyof typeof TurnOutcome];

export interface TurnMessage {
  id: string;
  type: MessageType;
  text: string | null;
}

export interface TurnReply {
  text: string;
  model: string;
  costMicroUsd: bigint;
}

/** The assistant (E-13) and the channel (E-09) seen from the turn. */
export interface TurnDeps {
  respond: (input: {
    tenantId: string;
    conversationId: string;
    turnId: string;
    messages: readonly TurnMessage[];
  }) => Promise<TurnReply>;
  send: (
    tx: Tx,
    input: { conversationId: string; text: string },
  ) => Promise<{ providerMessageId: string }>;
}

export interface TurnJob {
  tenantId: string;
  conversationId: string;
  version: number;
}

/**
 * One turn (spec 03, "Execução do turno"): claim the pending messages, generate outside
 * any transaction, then send under the lock only if nothing changed meanwhile.
 */
export async function runTurn(db: Db, job: TurnJob, deps: TurnDeps): Promise<TurnOutcome> {
  const claimed = await db.withTenant(job.tenantId, (tx) => claim(tx, job));
  if (!claimed) return TurnOutcome.stale;
  try {
    const reply = await deps.respond({
      ...job,
      turnId: claimed.turnId,
      messages: claimed.messages,
    });
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

async function claim(
  tx: Tx,
  job: TurnJob,
): Promise<{ turnId: string; messages: TurnMessage[] } | null> {
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
    select: { id: true, type: true, text: true },
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
  return { turnId: turn.id, messages };
}

interface Delivery {
  job: TurnJob;
  turnId: string;
  reply: TurnReply;
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
  await finish(tx, turnId, { state: TurnState.sent, reply });
  return TurnOutcome.sent;
}

async function finish(
  tx: Tx,
  turnId: string,
  { state, reply }: { state: TurnState; reply?: TurnReply },
): Promise<void> {
  await tx.turn.update({
    where: { id: turnId },
    data: {
      state,
      finishedAt: new Date(),
      ...(reply ? { model: reply.model, costMicroUsd: reply.costMicroUsd } : {}),
    },
  });
}
