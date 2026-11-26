import { MS_PER_DAY } from '@app/core';
import {
  AppointmentStatus,
  Prisma,
  ScheduledMessageKind,
  ScheduledMessageState,
  type Tx,
} from '@app/db';
import { NotifyReason } from '../notify/index.ts';
import { WaitlistCopy } from './copy.ts';
import type { WaitlistDeps } from './offer-sweep.ts';
import { ProactiveOutcome, sendProactive, tellsProfessional } from './proactive.ts';
import { forEachTenant } from './tenants.ts';

// M-09 (spec 05, "Falta"): with the owner's switch on, a "faltou" mark makes the assistant ask
// the client when to reschedule, once. Only the client's first no-show: what a repeat costs (the
// pilot loses the session) is the owner's call, so the assistant stays quiet. The row in
// scheduled_messages (kind follow_up) is the ledger that keeps it to one message.

/** Marks older than this never trigger a message (turning the switch on does not reach back). */
const LOOKBACK_MS = MS_PER_DAY;

export async function sweepNoShows(deps: WaitlistDeps): Promise<number> {
  let sent = 0;
  await forEachTenant(deps, { noShowFollowUp: true }, async (tenantId) => {
    const due = await deps.db.withTenant(tenantId, (tx) =>
      tx.appointment.findMany({
        where: {
          status: AppointmentStatus.no_show,
          updatedAt: { gte: new Date(deps.now.getTime() - LOOKBACK_MS) },
          scheduledMessages: { none: { kind: ScheduledMessageKind.follow_up } },
        },
        select: { id: true },
      }),
    );
    for (const { id } of due) {
      const result = await deps.db.withTenant(tenantId, (tx) =>
        followUp(tx, { deps, tenantId, appointmentId: id }),
      );
      if (result?.outcome === ProactiveOutcome.sent) sent += 1;
      if (result?.conversationId && tellsProfessional(result.outcome))
        await deps.notify({
          tenantId,
          conversationId: result.conversationId,
          reason: NotifyReason.noShow,
        });
    }
  });
  return sent;
}

interface FollowUp {
  deps: WaitlistDeps;
  tenantId: string;
  appointmentId: string;
}

async function followUp(tx: Tx, { deps, tenantId, appointmentId }: FollowUp) {
  const appointment = await hold(tx, appointmentId);
  if (!appointment) return null;
  const { contactId } = appointment;
  const misses = await tx.appointment.count({
    where: { contactId, status: AppointmentStatus.no_show },
  });
  const ledger = (state: ScheduledMessageState, conversationId: string | null) =>
    tx.scheduledMessage.create({
      data: {
        tenantId,
        contactId,
        appointmentId,
        conversationId,
        kind: ScheduledMessageKind.follow_up,
        sendAt: deps.now,
        state,
      },
    });
  if (misses > 1) return ledger(ScheduledMessageState.cancelled, null).then(() => null);
  const { timezone } = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { timezone: true },
  });
  const text = WaitlistCopy.noShow({
    ...appointment,
    serviceName: appointment.service.name,
    timezone,
  });
  const result = await sendProactive(tx, {
    message: { tenantId, contactId, text, now: deps.now },
    channel: deps.channel,
  });
  const sent = result.outcome === ProactiveOutcome.sent;
  await ledger(
    sent ? ScheduledMessageState.sent : ScheduledMessageState.cancelled,
    result.conversationId,
  );
  return result;
}

/** Row lock, then the ledger is read again: a concurrent sweep never sends twice. */
async function hold(tx: Tx, appointmentId: string) {
  await tx.$queryRaw(
    Prisma.sql`select id from appointments where id = ${appointmentId}::uuid for update`,
  );
  return tx.appointment.findFirst({
    where: {
      id: appointmentId,
      status: AppointmentStatus.no_show,
      scheduledMessages: { none: { kind: ScheduledMessageKind.follow_up } },
    },
    include: { service: true },
  });
}
