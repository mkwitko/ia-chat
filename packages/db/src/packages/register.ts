import type { Tx } from '../index.ts';

// Research 09 #7: the owner records a package the client bought ("Registrar pacote"). Name,
// sessions and price are copied in, so a later edit of the business profile changes nothing here.

export interface PackagePurchase {
  tenantId: string;
  contactId: string;
  name: string;
  sessions: number;
  priceCents: number;
  /** Local date, `YYYY-MM-DD`. */
  purchasedOn: string;
  paid: boolean;
}

const MIDNIGHT_UTC = 'T00:00:00Z';

export function registerPackage(tx: Tx, purchase: PackagePurchase) {
  const { purchasedOn, ...rest } = purchase;
  return tx.clientPackage.create({
    data: { ...rest, purchasedOn: new Date(`${purchasedOn}${MIDNIGHT_UTC}`) },
  });
}
