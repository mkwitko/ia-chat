import { phoneKey, type ContactRef } from '@app/channels';
import {
  ConsentActor,
  ConsentCategory,
  ConsentKind,
  ConsentSource,
  recordConsent,
  type Tx,
} from '@app/db';

type Contact = Awaited<ReturnType<Tx['contact']['create']>>;

/**
 * RF-23b: look up by BSUID first, then by phone key (ninth digit normalized). A contact
 * that was known by only one of the two gets the other completed instead of a duplicate.
 */
export async function resolveContact(tx: Tx, tenantId: string, ref: ContactRef): Promise<Contact> {
  const key = ref.phoneE164 ? phoneKey(ref.phoneE164) : null;
  const byBsuid = ref.bsuid
    ? await tx.contact.findUnique({ where: { tenantId_bsuid: { tenantId, bsuid: ref.bsuid } } })
    : null;
  const byPhone = key
    ? await tx.contact.findUnique({ where: { tenantId_phoneKey: { tenantId, phoneKey: key } } })
    : null;
  const found = byBsuid ?? byPhone;
  if (!found) {
    const phone = key ? { phoneKey: key, phoneE164: ref.phoneE164 ?? null } : {};
    const created = await tx.contact.create({
      data: { tenantId, bsuid: ref.bsuid ?? null, name: ref.name ?? null, ...phone },
    });
    // Writing first is the opt-in to the conversation itself (not to marketing).
    await recordConsent(tx, {
      tenantId,
      contactId: created.id,
      kind: ConsentKind.opt_in,
      category: ConsentCategory.service,
      source: ConsentSource.patient_message,
      actor: { type: ConsentActor.contact },
      now: new Date(),
    });
    return created;
  }
  // ponytail: a person already stored twice (one record by BSUID, another by phone) is not
  // merged here; the BSUID record wins. Merge in the inbox if it ever shows up.
  const missing = completion(found, ref, byPhone ? null : key);
  if (Object.keys(missing).length === 0) return found;
  return tx.contact.update({ where: { id: found.id }, data: missing });
}

/** Fields the stored contact lacks and this event brings. A key held by another contact is skipped. */
function completion(found: Contact, ref: ContactRef, freeKey: string | null) {
  return {
    ...(!found.bsuid && ref.bsuid ? { bsuid: ref.bsuid } : {}),
    ...(!found.phoneKey && freeKey ? { phoneKey: freeKey, phoneE164: ref.phoneE164 ?? null } : {}),
    ...(!found.name && ref.name ? { name: ref.name } : {}),
  };
}
