import {
  OFFER_TTL_MINUTES,
  Prisma,
  claimSlotOffer,
  expireWaitlist,
  freedSlots,
  recordOffers,
  skipSlotOffer,
  type ClaimedOffer,
  type Db,
  type Tx,
} from '@app/db';
import type { Alert } from '@app/observability';
import { NotifyReason, type Notifier } from '../notify/index.ts';
import type { ReminderChannel } from '../reminders/deliver.ts';
import { WaitlistCopy } from './copy.ts';
import { forEachTenant } from './tenants.ts';
import { ProactiveOutcome, sendProactive, tellsProfessional } from './proactive.ts';

// M-09 (spec 05, "Lista de espera"): every minute, close what expired and offer each freed slot
// to the next entry. One transaction per slot: a concurrent sweep that opens the same offer
// fails on the partial unique index and rolls back, so nobody gets two messages.

/** Entries tried per slot in one run when the earlier ones cannot be reached. No mass sending. */
const MAX_TRIES_PER_SLOT = 5;

export interface WaitlistDeps {
  db: Db;
  channel: Pick<ReminderChannel, 'send'>;
  notify: Notifier;
  alert: Alert;
  now: Date;
  /** Tests and one-off runs: only this tenant. */
  onlyTenantId?: string;
}

export interface WaitlistResult {
  offered: number;
  skipped: number;
}

export async function sweepWaitlist(deps: WaitlistDeps): Promise<WaitlistResult> {
  const result: WaitlistResult = { offered: 0, skipped: 0 };
  await forEachTenant(deps, {}, async (tenantId) => {
    await deps.db.withTenant(tenantId, (tx) => expireWaitlist(tx, deps.now));
    const slots = await deps.db.withTenant(tenantId, (tx) => freedSlots(tx, deps.now));
    for (const startsAt of slots) await offerSlot(deps, { tenantId, startsAt, result });
  });
  return result;
}

interface SlotRun {
  tenantId: string;
  startsAt: Date;
  result: WaitlistResult;
}

async function offerSlot(deps: WaitlistDeps, run: SlotRun): Promise<void> {
  for (let tries = 0; tries < MAX_TRIES_PER_SLOT; tries += 1) {
    const attempt = await deps.db
      .withTenant(run.tenantId, (tx) => offerOnce(tx, deps, run))
      .catch(raceLost);
    if (!attempt) return;
    if (attempt.outcome === ProactiveOutcome.sent) {
      run.result.offered += 1;
      return;
    }
    run.result.skipped += 1;
    if (attempt.conversationId && tellsProfessional(attempt.outcome))
      await deps.notify({
        tenantId: run.tenantId,
        conversationId: attempt.conversationId,
        reason: NotifyReason.waitlistSlot,
      });
  }
}

const UNIQUE_VIOLATION = 'P2002';

/** Another sweep opened this slot's offer first: it sends; this one stops. */
function raceLost(error: unknown): null {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION)
    return null;
  throw error;
}

async function offerOnce(tx: Tx, deps: WaitlistDeps, run: SlotRun) {
  const offer = await claimSlotOffer(tx, { startsAt: run.startsAt, now: deps.now });
  if (!offer) return null;
  const text = await textOf(tx, { offer, tenantId: run.tenantId });
  const sent = await sendProactive(tx, {
    message: { tenantId: run.tenantId, contactId: offer.contactId, text, now: deps.now },
    channel: deps.channel,
  });
  if (sent.outcome === ProactiveOutcome.sent && sent.conversationId)
    // The slot counts as offered by the assistant: the client's "sim" books it through `agendar`.
    await recordOffers(tx, {
      conversationId: sent.conversationId,
      serviceId: offer.serviceId,
      now: deps.now,
      slots: [{ start: offer.startsAt }],
    });
  else
    await skipSlotOffer(tx, {
      offerId: offer.offerId,
      dropEntry: sent.outcome === ProactiveOutcome.optOut,
    });
  return sent;
}

async function textOf(tx: Tx, { offer, tenantId }: { offer: ClaimedOffer; tenantId: string }) {
  const { timezone } = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { timezone: true },
  });
  return WaitlistCopy.offer({ ...offer, timezone, minutes: OFFER_TTL_MINUTES });
}
