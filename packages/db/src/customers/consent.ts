import { ConsentCategory, ConsentKind } from '../../generated/prisma/enums.ts';
import type { ConsentSource } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';

// Spec 03 (opt-out): every change of consent leaves a row (kind, category, source, actor, date).
// `contacts.opt_out_at` stays as the fast flag the prefilter and the senders read.

export const ConsentActor = { contact: 'contact', user: 'user', system: 'system' } as const;
export type ConsentActor = (typeof ConsentActor)[keyof typeof ConsentActor];

export interface ConsentChange {
  tenantId: string;
  contactId: string;
  kind: ConsentKind;
  category: ConsentCategory;
  source: ConsentSource;
  actor: { type: ConsentActor; id?: string | undefined };
  /** The wording the client saw when agreeing, when there was one (form, import). */
  noticeText?: string | undefined;
  now: Date;
}

/**
 * Records the change and keeps `opt_out_at` in step: an opt-out of everything sets it (the
 * first date is kept), an opt-in to everything clears it. A repeated opt-out writes nothing.
 */
export async function recordConsent(tx: Tx, change: ConsentChange): Promise<boolean> {
  const contact = await tx.contact.findUnique({
    where: { tenantId_id: { tenantId: change.tenantId, id: change.contactId } },
    select: { optOutAt: true },
  });
  if (!contact) return false;
  const all = change.category === ConsentCategory.all;
  const optOut = change.kind === ConsentKind.opt_out;
  if (optOut && all && contact.optOutAt) return false;
  await tx.consentEvent.create({
    data: {
      tenantId: change.tenantId,
      contactId: change.contactId,
      kind: change.kind,
      category: change.category,
      source: change.source,
      actorType: change.actor.type,
      actorId: change.actor.id ?? null,
      noticeText: change.noticeText ?? null,
      createdAt: change.now,
    },
  });
  if (all) {
    await tx.contact.update({
      where: { tenantId_id: { tenantId: change.tenantId, id: change.contactId } },
      data: { optOutAt: optOut ? change.now : null },
    });
  }
  return true;
}
