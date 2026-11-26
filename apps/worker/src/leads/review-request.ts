import {
  MS_PER_DAY,
  REVIEW_LOOKBACK_DAYS,
  REVIEW_MIN_GAP_DAYS,
  parseBusinessProfile,
  reviewRequestText,
} from '@app/core';
import {
  AppointmentStatus,
  Prisma,
  ScheduledMessageKind,
  ScheduledMessageState,
  type Tx,
} from '@app/db';
import { NotifyReason } from '../notify/index.ts';
import type { WaitlistDeps } from '../waitlist/offer-sweep.ts';
import { ProactiveOutcome, sendProactive, tellsProfessional } from '../waitlist/proactive.ts';
import { forEachTenant } from '../waitlist/tenants.ts';

// M-12 (spec 11, metric 14): some hours after "Compareceu", one message asks for a public review
// with the owner's link. Same path as the other proactive sends (opt-out gate, AI control, 24 h
// window; outside it the professional is told, E-00b). One per appointment (the ledger row) and
// one per client in REVIEW_MIN_GAP_DAYS. The text is fixed in code: thanks and the link only.

/** Appointments handled per tenant in one run: never a bulk send. */
const MAX_PER_RUN = 5;
const MS_PER_HOUR = 3_600_000;

export type ReviewRequestDeps = WaitlistDeps;

export async function sweepReviewRequests(deps: ReviewRequestDeps): Promise<number> {
  let sent = 0;
  await forEachTenant(deps, { reviewRequest: true }, async (tenantId) => {
    const settings = await deps.db.withTenant(tenantId, (tx) =>
      tx.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: { reviewRequestDelayHours: true, businessProfile: true },
      }),
    );
    const link = parseBusinessProfile(settings.businessProfile).reviewLink;
    if (!link) return;
    const hours = settings.reviewRequestDelayHours;
    const due = await deps.db.withTenant(tenantId, (tx) => attended(tx, { deps, hours }));
    for (const appointment of due) {
      const result = await deps.db.withTenant(tenantId, (tx) =>
        ask(tx, { deps, tenantId, appointment, text: reviewRequestText(link) }),
      );
      if (result?.outcome === ProactiveOutcome.sent) sent += 1;
      if (result?.conversationId && tellsProfessional(result.outcome))
        await deps.notify({
          tenantId,
          conversationId: result.conversationId,
          reason: NotifyReason.reviewRequest,
        });
    }
  });
  return sent;
}

/**
 * Marked "Compareceu" at least the delay ago but not before the lookback (turning the switch on
 * does not reach back), not asked yet, and the client not asked in the last REVIEW_MIN_GAP_DAYS.
 */
function attended(tx: Tx, { deps, hours }: { deps: ReviewRequestDeps; hours: number }) {
  const markedBefore = new Date(deps.now.getTime() - hours * MS_PER_HOUR);
  const tooOld = new Date(markedBefore.getTime() - REVIEW_LOOKBACK_DAYS * MS_PER_DAY);
  const gapStart = new Date(deps.now.getTime() - REVIEW_MIN_GAP_DAYS * MS_PER_DAY);
  return tx.appointment.findMany({
    where: {
      status: AppointmentStatus.completed,
      updatedAt: { lte: markedBefore, gte: tooOld },
      scheduledMessages: { none: { kind: ScheduledMessageKind.review_request } },
      contact: { scheduledMessages: { none: askedSince(gapStart) } },
    },
    orderBy: { updatedAt: 'asc' },
    take: MAX_PER_RUN,
    select: { id: true, contactId: true },
  });
}

const askedSince = (since: Date): Prisma.ScheduledMessageWhereInput => ({
  kind: ScheduledMessageKind.review_request,
  state: ScheduledMessageState.sent,
  sendAt: { gte: since },
});

interface Ask {
  deps: ReviewRequestDeps;
  tenantId: string;
  appointment: { id: string; contactId: string };
  text: string;
}

async function ask(tx: Tx, { deps, tenantId, appointment, text }: Ask) {
  const { id: appointmentId, contactId } = appointment;
  await tx.$queryRaw(
    Prisma.sql`select id from appointments where id = ${appointmentId}::uuid for update`,
  );
  // Read again under the lock: a concurrent sweep, or an earlier visit of this client in this run.
  const gapStart = new Date(deps.now.getTime() - REVIEW_MIN_GAP_DAYS * MS_PER_DAY);
  const already = await tx.scheduledMessage.count({
    where: {
      OR: [
        { appointmentId, kind: ScheduledMessageKind.review_request },
        { contactId, ...askedSince(gapStart) },
      ],
    },
  });
  if (already > 0) return null;
  const result = await sendProactive(tx, {
    message: { tenantId, contactId, text, now: deps.now },
    channel: deps.channel,
  });
  await tx.scheduledMessage.create({
    data: {
      tenantId,
      contactId,
      appointmentId,
      conversationId: result.conversationId,
      kind: ScheduledMessageKind.review_request,
      sendAt: deps.now,
      state:
        result.outcome === ProactiveOutcome.sent
          ? ScheduledMessageState.sent
          : ScheduledMessageState.cancelled,
    },
  });
  return result;
}
