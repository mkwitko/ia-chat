import { setTimeout as sleep } from 'node:timers/promises';
import { MessageDirection, type Tx } from '@app/db';
import { QrSendRefused, qrSendDecision, type QrSendKind } from './limits.ts';

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000; // rolling 24 h

export interface QrGateInput {
  channelId: string;
  contactId: string;
  kind: QrSendKind;
  now: Date;
}

/** RF-28 before every send on the QR code channel: refuses (throws) or waits the interval. */
export async function passQrGate(tx: Tx, input: QrGateInput): Promise<void> {
  const decision = qrSendDecision(await factsOf(tx, input));
  if (!decision.ok) throw new QrSendRefused(decision.refusal);
  if (decision.waitMs > 0) await sleep(decision.waitMs);
}

async function factsOf(tx: Tx, { channelId, contactId, kind, now }: QrGateInput) {
  const outbound = { channelId, direction: MessageDirection.outbound };
  const since = (ms: number) => ({ ...outbound, createdAt: { gte: new Date(now.getTime() - ms) } });
  const [sentLastMinute, sentLastDay, last, wrote] = await Promise.all([
    tx.message.count({ where: since(MINUTE_MS) }),
    tx.message.count({ where: since(DAY_MS) }),
    tx.message.findFirst({
      where: outbound,
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    tx.message.findFirst({
      where: { direction: MessageDirection.inbound, conversation: { contactId } },
      select: { id: true },
    }),
  ]);
  return {
    kind,
    contactWrote: wrote !== null,
    lastSentAt: last?.createdAt ?? null,
    sentLastMinute,
    sentLastDay,
    now,
  };
}
