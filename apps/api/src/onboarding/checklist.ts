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
}

export async function checklistOf(tx: Tx, tenantId: string): Promise<Checklist> {
  const [tenant, professional, unanswered] = await Promise.all([
    tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { businessProfile: true } }),
    tx.professional.findFirst({ orderBy: { createdAt: 'asc' }, select: { toneOfVoice: true } }),
    pendingCount(tx),
  ]);
  const profile = parseBusinessProfile(tenant.businessProfile);
  return {
    tone: Boolean(professional?.toneOfVoice),
    reviewLink: Boolean(profile.reviewLink),
    packages: profile.packages.length,
    unanswered,
  };
}
