import { parseBusinessProfile } from '@app/core';
import type { Tx } from '@app/db';
import { pendingCount } from '../setup/unanswered-routes.ts';

// docs/research/09, "Adiar para depois da ativação": what the owner may refine on Início once
// the assistant is on. Facts only (is it set?), never content.

export interface Checklist {
  tone: boolean;
  reviewLink: boolean;
  packages: number;
  /** Questions the assistant could not answer that still wait for an answer. */
  unanswered: number;
  /** Someone besides the owner has access, or an invitation is on its way. */
  team: boolean;
}

const OWNER_ONLY = 1;
const INVITATION_PENDING = 'pending';

export async function checklistOf(tx: Tx, tenantId: string): Promise<Checklist> {
  const [tenant, professional, unanswered, members, invitations] = await Promise.all([
    tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { businessProfile: true } }),
    tx.professional.findFirst({ orderBy: { createdAt: 'asc' }, select: { toneOfVoice: true } }),
    pendingCount(tx),
    tx.membership.count({ where: { tenantId } }),
    tx.invitation.count({ where: { tenantId, status: INVITATION_PENDING } }),
  ]);
  const profile = parseBusinessProfile(tenant.businessProfile);
  return {
    tone: Boolean(professional?.toneOfVoice),
    reviewLink: Boolean(profile.reviewLink),
    packages: profile.packages.length,
    unanswered,
    team: members > OWNER_ONLY || invitations > 0,
  };
}
