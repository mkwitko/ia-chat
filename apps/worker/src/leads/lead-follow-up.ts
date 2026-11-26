import { LEAD_FOLLOW_UP_LOOKBACK_DAYS, MS_PER_DAY } from '@app/core';
import {
  PipelineStage,
  ScheduledMessageKind,
  ScheduledMessageState,
  lockConversation,
  type Tx,
} from '@app/db';
import { NotifyReason } from '../notify/index.ts';
import {
  ProactiveOutcome,
  sendProactive,
  tellsProfessional,
  type ProactiveResult,
} from '../waitlist/proactive.ts';
import type { WaitlistDeps } from '../waitlist/offer-sweep.ts';
import { forEachTenant } from '../waitlist/tenants.ts';

// M-10 (spec 11, "Recuperação de lead"): a lead that went quiet gets ONE message, with the text
// the owner approved. Same path as the other proactive sends (opt-out gate, AI control, 24 h
// window); outside the window no template is approved yet (E-00b), so the professional is told.
// The scheduled_messages row (kind lead_follow_up) per contact keeps it to one, ever.

export type LeadFollowUpDeps = WaitlistDeps;

/** Candidates handled per tenant in one run: this is never a bulk send. */
const MAX_PER_RUN = 5;

export async function sweepLeadFollowUps(deps: LeadFollowUpDeps): Promise<number> {
  let sent = 0;
  await forEachTenant(
    deps,
    { leadFollowUp: true, leadFollowUpText: { not: null } },
    async (tenantId) => {
      const { leadFollowUpDays: days, leadFollowUpText: text } = await deps.db.withTenant(
        tenantId,
        (tx) =>
          tx.tenant.findUniqueOrThrow({
            where: { id: tenantId },
            select: { leadFollowUpDays: true, leadFollowUpText: true },
          }),
      );
      if (!text) return;
      const due = await deps.db.withTenant(tenantId, (tx) => quietLeads(tx, { deps, days }));
      for (const { id, contactId } of due) {
        const result = await deps.db.withTenant(tenantId, (tx) =>
          followUp(tx, { deps, tenantId, target: { conversationId: id, contactId }, text }),
        );
        if (result?.outcome === ProactiveOutcome.sent) sent += 1;
        if (result?.conversationId && tellsProfessional(result.outcome))
          await deps.notify({
            tenantId,
            conversationId: result.conversationId,
            reason: NotifyReason.leadFollowUp,
          });
      }
    },
  );
  return sent;
}

/**
 * Not booked (never had an appointment), our message was the last one, quiet for the wait, and
 * not older than the lookback (turning the switch on does not reach back), never followed up.
 */
function quietLeads(tx: Tx, { deps, days }: { deps: LeadFollowUpDeps; days: number }) {
  const quietSince = new Date(deps.now.getTime() - days * MS_PER_DAY);
  const tooOld = new Date(quietSince.getTime() - LEAD_FOLLOW_UP_LOOKBACK_DAYS * MS_PER_DAY);
  return tx.conversation.findMany({
    where: {
      lastMessageAt: { lte: quietSince, gte: tooOld },
      pendingSince: null,
      contact: {
        appointments: { none: {} },
        OR: [{ stageOverride: null }, { stageOverride: { not: PipelineStage.lost } }],
        scheduledMessages: { none: { kind: ScheduledMessageKind.lead_follow_up } },
      },
    },
    orderBy: { lastMessageAt: 'asc' },
    take: MAX_PER_RUN,
    select: { id: true, contactId: true },
  });
}

interface FollowUp {
  deps: LeadFollowUpDeps;
  tenantId: string;
  target: { conversationId: string; contactId: string };
  text: string;
}

async function followUp(
  tx: Tx,
  { deps, tenantId, target, text }: FollowUp,
): Promise<ProactiveResult | null> {
  const { conversationId, contactId } = target;
  await lockConversation(tx, conversationId);
  const already = await tx.scheduledMessage.count({
    where: { contactId, kind: ScheduledMessageKind.lead_follow_up },
  });
  if (already > 0) return null; // a concurrent sweep got here first
  const result = await sendProactive(tx, {
    message: { tenantId, contactId, text, now: deps.now },
    channel: deps.channel,
  });
  await tx.scheduledMessage.create({
    data: {
      tenantId,
      contactId,
      conversationId: result.conversationId ?? conversationId,
      kind: ScheduledMessageKind.lead_follow_up,
      sendAt: deps.now,
      state:
        result.outcome === ProactiveOutcome.sent
          ? ScheduledMessageState.sent
          : ScheduledMessageState.cancelled,
    },
  });
  return result;
}
