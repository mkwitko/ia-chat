// Meta WhatsApp pricing (research 01 §6, spec 03). Each client pays Meta on their own card, so
// this is an estimate shown to the professional and the operator, never an invoice line.

export const MetaCategory = {
  service: 'service',
  utility: 'utility',
  marketing: 'marketing',
  authentication: 'authentication',
  other: 'other',
} as const;
export type MetaCategory = (typeof MetaCategory)[keyof typeof MetaCategory];

/** First service messages of each business phone number per month are free. */
export const FREE_SERVICE_MESSAGES = 1000;

/**
 * Money here is in milli-cents (cents x 1000, integer, no floats): R$ 0,035 = 3.500 and
 * R$ 0,3217 = 32.170. Rounded to cents only for display.
 */
export const MILLI_CENTS_PER_CENT = 1000;
export const SERVICE_OVER_FREE_MILLI_CENTS = 3500;
export const UTILITY_MILLI_CENTS = 3500;
export const MARKETING_MILLI_CENTS = 32_170;

/** Billable price per message. Authentication is not sent by the product (price 0 until it is). */
const BILLABLE_MILLI_CENTS: Readonly<Record<MetaCategory, number>> = {
  [MetaCategory.service]: SERVICE_OVER_FREE_MILLI_CENTS,
  [MetaCategory.utility]: UTILITY_MILLI_CENTS,
  [MetaCategory.marketing]: MARKETING_MILLI_CENTS,
  [MetaCategory.authentication]: 0,
  [MetaCategory.other]: 0,
};

/** Delivered messages of one channel in the month, grouped as stored (meta_message_usage). */
export interface MetaUsageRow {
  channelId: string;
  category: MetaCategory;
  billable: boolean;
  count: number;
}

export interface MetaUsageSummary {
  /** All service messages of the month (free or not). */
  serviceUsed: number;
  /** Free service messages available: 1.000 per channel that sent anything (at least one). */
  serviceFree: number;
  serviceOver: number;
  /** Billable messages per category; service counts only what passed the free allowance. */
  billable: Readonly<Record<MetaCategory, number>>;
  estimatedCostCents: number;
}

const emptyCounts = (): Record<MetaCategory, number> => ({
  [MetaCategory.service]: 0,
  [MetaCategory.utility]: 0,
  [MetaCategory.marketing]: 0,
  [MetaCategory.authentication]: 0,
  [MetaCategory.other]: 0,
});

export function summarizeMetaUsage(rows: readonly MetaUsageRow[]): MetaUsageSummary {
  const serviceByChannel = new Map<string, number>();
  const billable = emptyCounts();
  for (const row of rows) {
    if (row.category === MetaCategory.service)
      serviceByChannel.set(row.channelId, (serviceByChannel.get(row.channelId) ?? 0) + row.count);
    else if (row.billable) billable[row.category] += row.count;
  }
  const serviceCounts = [...serviceByChannel.values()];
  const serviceUsed = serviceCounts.reduce((sum, n) => sum + n, 0);
  billable[MetaCategory.service] = serviceCounts.reduce(
    (sum, n) => sum + Math.max(n - FREE_SERVICE_MESSAGES, 0),
    0,
  );
  const milliCents = Object.values(MetaCategory).reduce(
    (sum, category) => sum + billable[category] * BILLABLE_MILLI_CENTS[category],
    0,
  );
  return {
    serviceUsed,
    serviceFree: FREE_SERVICE_MESSAGES * Math.max(serviceCounts.length, 1),
    serviceOver: billable[MetaCategory.service],
    billable,
    estimatedCostCents: Math.round(milliCents / MILLI_CENTS_PER_CENT),
  };
}
