import { StageSource } from '../../generated/prisma/enums.ts';
import type { LostReason, PipelineStage } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';
import { loadFacts, stageOf } from './facts.ts';

// The stage itself is never stored: it is derived on every read. What is stored is the history of
// changes, written at the moments a fact changes (message, booking, attendance, manual stage).

export interface StageSync {
  tenantId: string;
  contactId: string;
  now: Date;
}

/** Writes a history entry when the derived stage differs from the last one logged. */
export async function syncStage(tx: Tx, { tenantId, contactId, now }: StageSync) {
  const [row] = await loadFacts(tx, contactId);
  if (!row) return null;
  const stage = stageOf(row, now);
  await logStage(tx, { tenantId, contactId, stage, source: StageSource.derived });
  return stage;
}

/** Syncs before (records a time-based "não agendou") and after a change of facts. */
export async function withStageSync<T>(tx: Tx, scope: StageSync, work: () => Promise<T>) {
  await syncStage(tx, scope);
  const value = await work();
  await syncStage(tx, scope);
  return value;
}

export interface StageLog {
  tenantId: string;
  contactId: string;
  stage: PipelineStage;
  source: StageSource;
  actorId?: string | undefined;
  lostReason?: LostReason | undefined;
}

/** The last stage logged for the contact; null before the first entry. */
async function lastLogged(tx: Tx, contactId: string) {
  const last = await tx.contactStageEvent.findFirst({
    where: { contactId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { toStage: true },
  });
  return last?.toStage ?? null;
}

export async function logStage(tx: Tx, entry: StageLog): Promise<void> {
  const from = await lastLogged(tx, entry.contactId);
  const manual = entry.source === StageSource.manual;
  if (from === entry.stage && !manual) return;
  await tx.contactStageEvent.create({
    data: {
      tenantId: entry.tenantId,
      contactId: entry.contactId,
      fromStage: from,
      toStage: entry.stage,
      source: entry.source,
      actorId: entry.actorId ?? null,
      lostReason: entry.lostReason ?? null,
    },
  });
}
