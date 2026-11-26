import { MS_PER_DAY } from '@app/core';
import type { PackageEntryReason } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';

// Research 09 #7: a package's balance is its size minus the sum of its ledger (+1 used, -1 back).

export interface PackageEntryView {
  delta: number;
  reason: PackageEntryReason;
  createdAt: Date;
}

export interface PackageBalance {
  id: string;
  name: string;
  sessions: number;
  used: number;
  remaining: number;
  priceCents: number;
  paid: boolean;
  /** Local date, `YYYY-MM-DD`. */
  purchasedOn: string;
  entries: PackageEntryView[];
}

const DAY_LENGTH = 10;

/** The client's packages, oldest purchase first (the order a session is debited in). */
export async function contactPackages(tx: Tx, contactId: string): Promise<PackageBalance[]> {
  const rows = await tx.clientPackage.findMany({
    where: { contactId },
    orderBy: [{ purchasedOn: 'asc' }, { createdAt: 'asc' }],
    include: {
      entries: {
        orderBy: { createdAt: 'asc' },
        select: { delta: true, reason: true, createdAt: true },
      },
    },
  });
  return rows.map((row) => {
    const used = row.entries.reduce((sum, entry) => sum + entry.delta, 0);
    return {
      id: row.id,
      name: row.name,
      sessions: row.sessions,
      used,
      remaining: row.sessions - used,
      priceCents: row.priceCents,
      paid: row.paid,
      purchasedOn: row.purchasedOn.toISOString().slice(0, DAY_LENGTH),
      entries: row.entries,
    };
  });
}

export interface EndingPackage {
  id: string;
  contactId: string;
  name: string;
  sessions: number;
  remaining: number;
  contactName: string | null;
}

const SHOWN = 5;
const ENDING_AT = 1;
const RECENT_DAYS = 30;

/**
 * Início, "pacotes terminando": the client's latest package with at most one session left. A used-up
 * one stays while its last session is recent (30 days); a newer package takes its place.
 */
export function endingPackages(tx: Tx, now: Date): Promise<EndingPackage[]> {
  const since = new Date(now.getTime() - RECENT_DAYS * MS_PER_DAY);
  return tx.$queryRaw<EndingPackage[]>`
    select p.id, p.contact_id as "contactId", p.name, p.sessions,
      (p.sessions - coalesce(sum(e.delta), 0))::int as remaining,
      coalesce(c.name, c.phone_e164) as "contactName"
    from client_packages p
    join contacts c on c.id = p.contact_id
    left join package_entries e on e.package_id = p.id
    where not exists (select 1 from client_packages n where n.contact_id = p.contact_id
      and (n.purchased_on, n.created_at) > (p.purchased_on, p.created_at))
    group by p.id, c.id
    having p.sessions - coalesce(sum(e.delta), 0) <= ${ENDING_AT}
      and (p.sessions - coalesce(sum(e.delta), 0) > 0 or max(e.created_at) >= ${since})
    order by remaining, p.purchased_on
    limit ${SHOWN}`;
}
