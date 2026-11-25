import {
  ConsentActor,
  ConsentCategory,
  ConsentSource,
  recordConsent,
  type ConsentKind,
  type Db,
} from '@app/db';

// M-01: the client's own words are the only way consent changes from the conversation.

interface ClientConsent {
  tenantId: string;
  contactId: string;
  kind: ConsentKind;
}

export function recordClientConsent(db: Db, { tenantId, contactId, kind }: ClientConsent) {
  return db.withTenant(tenantId, (tx) =>
    recordConsent(tx, {
      tenantId,
      contactId,
      kind,
      category: ConsentCategory.all,
      source: ConsentSource.patient_message,
      actor: { type: ConsentActor.contact },
      now: new Date(),
    }),
  );
}

export function isOptedOut(db: Db, tenantId: string, contactId: string): Promise<boolean> {
  return db.withTenant(tenantId, async (tx) => {
    const contact = await tx.contact.findUnique({
      where: { tenantId_id: { tenantId, id: contactId } },
      select: { optOutAt: true },
    });
    return contact?.optOutAt != null;
  });
}
