import { PipelineStage, StageSource } from '../../generated/prisma/enums.ts';
import type { LostReason } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';
import { loadFacts, stageOf } from './facts.ts';
import { logStage } from './sync.ts';

export interface ManualStage {
  tenantId: string;
  contactId: string;
  userId: string;
  now: Date;
  /** null returns the contact to the automatic stage. */
  stage: PipelineStage | null;
  /** Required with `lost`, ignored otherwise. */
  lostReason?: LostReason | undefined;
}

/** Why a manual stage was refused: `lost` needs one of the fixed reasons. */
export const ManualStageError = { lostNeedsReason: 'lost_needs_reason' } as const;
export type ManualStageError = (typeof ManualStageError)[keyof typeof ManualStageError];

/**
 * The owner's stage, audited by the caller: kept until a newer message or appointment change
 * outdates it. Returns the stage now in effect, or null when the contact does not exist.
 */
export async function setManualStage(tx: Tx, input: ManualStage) {
  const lost = input.stage === PipelineStage.lost;
  if (lost && !input.lostReason) return ManualStageError.lostNeedsReason;
  const { count } = await tx.contact.updateMany({
    where: { id: input.contactId },
    data: {
      stageOverride: input.stage,
      stageOverrideAt: input.stage ? input.now : null,
      lostReason: lost ? (input.lostReason ?? null) : null,
    },
  });
  if (count === 0) return null;
  const [row] = await loadFacts(tx, input.contactId);
  if (!row) return null;
  const stage = stageOf(row, input.now);
  await logStage(tx, {
    tenantId: input.tenantId,
    contactId: input.contactId,
    stage,
    source: StageSource.manual,
    actorId: input.userId,
    lostReason: lost ? input.lostReason : undefined,
  });
  return stage;
}
