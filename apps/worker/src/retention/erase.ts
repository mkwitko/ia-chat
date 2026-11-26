import type { Db, Tx } from '@app/db';

const ANONYMIZED_NAME = 'Conta encerrada';

type Eraser = (tx: Tx, tenantId: string) => Promise<{ count: number }>;

/**
 * Business tables of one tenant, children before parents (every foreign key is Restrict).
 * Kept on purpose: `audit_log` (append-only, no message content, RN-07) and `usage_counters`
 * (numbers only). The unique tenant row stays, anonymized, because those rows point to it.
 */
const ERASERS: readonly Eraser[] = [
  (tx, tenantId) => tx.aiUsage.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.message.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.turn.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.scheduledMessage.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.payment.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.packageEntry.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.clientPackage.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.slotOffer.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.slotWaitlistEntry.deleteMany({ where: { tenantId } }),
  // The remarcação link points inside the same table: cut it first (Restrict).
  (tx, tenantId) =>
    tx.appointment.updateMany({ where: { tenantId }, data: { rescheduledFromId: null } }),
  (tx, tenantId) => tx.appointment.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.metaMessageUsage.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.inboundEvent.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.conversation.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.contact.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.channelRoute.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.channel.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.availabilityRule.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.timeOff.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.professional.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.service.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.location.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.knowledgeItem.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.pushSubscription.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.calendarIntegration.deleteMany({ where: { tenantId } }),
  (tx, tenantId) => tx.invitation.deleteMany({ where: { tenantId } }),
];

/** Erases the tenant's business rows in one transaction (RLS scopes it) and returns its member ids. */
async function eraseBusinessRows(db: Db, tenantId: string): Promise<string[]> {
  return db.withTenant(tenantId, async (tx) => {
    // Append-only for the app role: only this function (migration erase_append_only) may delete them.
    await tx.$executeRaw`select erase_closed_tenant_events(${tenantId}::uuid)`;
    for (const erase of ERASERS) await erase(tx, tenantId);
    const members = await tx.membership.findMany({ where: { tenantId }, select: { userId: true } });
    await tx.membership.deleteMany({ where: { tenantId } });
    return members.map((member) => member.userId);
  });
}

/**
 * RF-63: erases everything of a closed account. Rows first, then the owners' accounts (only users
 * with no other membership), the onboarding invite (it holds an email) and the tenant's identity.
 * Stamps `data_deleted_at` last, so a failure halfway is retried by the next run.
 */
export async function eraseTenant(db: Db, tenantId: string, now: Date): Promise<void> {
  const userIds = await eraseBusinessRows(db, tenantId);
  await db.client.user.deleteMany({ where: { id: { in: userIds }, memberships: { none: {} } } });
  await db.client.onboardingInvite.deleteMany({ where: { tenantId } });
  await db.client.tenant.update({
    where: { id: tenantId },
    data: {
      name: ANONYMIZED_NAME,
      slug: `encerrada-${tenantId}`,
      logo: null,
      metadata: null,
      document: null,
      billingInvoiceUrl: null,
      onboardingProgress: {},
      dataDeletedAt: now,
    },
  });
}
