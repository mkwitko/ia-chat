import { monthOf, MetaCategory } from '@app/core';
import type { Db } from '@app/db';
import { readMetaSummary } from '../usage/meta-usage.ts';

const MONTH_KEY_LENGTH = 7; // YYYY-MM
const TOP_TENANTS = 5;
// ponytail: one short transaction per tenant, one at a time; a SQL aggregate when hundreds of clients.
const MAX_TENANTS = 500;

export interface MetaTenantRow {
  id: string;
  name: string;
  serviceUsed: number;
  serviceOver: number;
  estimatedCostCents: number;
}

export interface MetaOverview {
  month: string;
  tenants: number;
  totals: {
    serviceUsed: number;
    serviceOver: number;
    utilityBillable: number;
    marketingBillable: number;
    estimatedCostCents: number;
  };
  /** Highest estimated cost first. */
  top: MetaTenantRow[];
}

const sum = (rows: readonly MetaTenantRow[], pick: (row: MetaTenantRow) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

/** Operator panel (E-27/H-05): Meta usage across tenants. Aggregates and tenant names only. */
export async function metaOverview(db: Db, now: Date): Promise<MetaOverview> {
  const month = monthOf(now);
  const tenants = await db.client.tenant.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: 'desc' },
    take: MAX_TENANTS,
  });
  const rows: MetaTenantRow[] = [];
  const billable = { utility: 0, marketing: 0 };
  for (const { id, name } of tenants) {
    const summary = await db.withTenant(id, (tx) => readMetaSummary(tx, month));
    billable.utility += summary.billable[MetaCategory.utility];
    billable.marketing += summary.billable[MetaCategory.marketing];
    rows.push({
      id,
      name,
      serviceUsed: summary.serviceUsed,
      serviceOver: summary.serviceOver,
      estimatedCostCents: summary.estimatedCostCents,
    });
  }
  return {
    month: month.toISOString().slice(0, MONTH_KEY_LENGTH),
    tenants: tenants.length,
    totals: {
      serviceUsed: sum(rows, (row) => row.serviceUsed),
      serviceOver: sum(rows, (row) => row.serviceOver),
      utilityBillable: billable.utility,
      marketingBillable: billable.marketing,
      estimatedCostCents: sum(rows, (row) => row.estimatedCostCents),
    },
    top: rows
      .filter((row) => row.estimatedCostCents > 0)
      .sort((a, b) => b.estimatedCostCents - a.estimatedCostCents)
      .slice(0, TOP_TENANTS),
  };
}
