// Plans, franchises and prices (spec 01, "Planos"): the single source for the worker, the API,
// the panel and the public site. Money in integer cents.

export const PlanId = {
  essencial: 'essencial',
  agenda: 'agenda',
  pro: 'pro',
  clinica: 'clinica',
} as const;
export type PlanId = (typeof PlanId)[keyof typeof PlanId];

export interface PlanTerms {
  /** Conversations included per month. */
  franchise: number;
  /** Price of each conversation above the franchise. */
  overageCents: number;
  monthlyCents: number;
}

export const PLANS = {
  [PlanId.essencial]: { franchise: 300, overageCents: 40, monthlyCents: 19_700 },
  [PlanId.agenda]: { franchise: 500, overageCents: 40, monthlyCents: 29_700 },
  [PlanId.pro]: { franchise: 1000, overageCents: 35, monthlyCents: 49_700 },
  [PlanId.clinica]: { franchise: 1000, overageCents: 35, monthlyCents: 69_700 },
} as const satisfies Record<PlanId, PlanTerms>;

/** Plans a customer can subscribe to now; Pro and Clínica wait for their features (spec 01). */
export const SELLABLE_PLANS = [PlanId.essencial, PlanId.agenda] as const;

/** Professionals included in Clínica; the other plans have one and no add-on (founder/pricing.md). */
export const CLINICA_INCLUDED_PROFESSIONALS = 2;

/** Each Clínica professional beyond the included ones adds this price and franchise. */
export const EXTRA_PROFESSIONAL = { franchise: 250, monthlyCents: 14_700 } as const;

/** Share of the franchise that triggers the first warning (spec 01). */
export const WARNING_PERCENT = 80;
const FULL_PERCENT = 100;

export interface UsageStatus {
  franchise: number;
  /** Not capped at 100: 116 means 16% above the franchise. */
  percent: number;
  warning: boolean;
  full: boolean;
  overageConversations: number;
  overageCents: number;
  /** Overage passed the owner's cap: the assistant stops calling the model. */
  restricted: boolean;
}

export interface UsageInput {
  plan: PlanId;
  conversations: number;
  /** Owner's overage cap in cents; null means no cap. */
  capCents: number | null;
}

export function usageStatus({ plan, conversations, capCents }: UsageInput): UsageStatus {
  const { franchise, overageCents: unit } = PLANS[plan];
  const overageConversations = Math.max(0, conversations - franchise);
  const overageCents = overageConversations * unit;
  return {
    franchise,
    percent: Math.floor((conversations * FULL_PERCENT) / franchise),
    warning: conversations * FULL_PERCENT >= franchise * WARNING_PERCENT,
    full: conversations >= franchise,
    overageConversations,
    overageCents,
    restricted: capCents !== null && overageCents > capCents,
  };
}

/** The usage month key: its first day, UTC (hypothesis H-17). */
export function monthOf(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
}
