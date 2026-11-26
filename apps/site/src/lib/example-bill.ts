import { PLANS, PlanId } from '@app/core';
import { META_PROFILES } from './meta-estimate.ts';
import { formatBrl, formatBrlShort, formatCount } from './money.ts';

// The example month on the landing and on /precos (founder/landing-brief.md, section 8):
// the featured plan plus what Meta charges for the "Médio" profile (spec 07).

const CENTS_PER_REAL = 100;
const EXAMPLE_PROFILE_INDEX = 1;
const PERCENT = 100;
/** Service messages Meta does not charge each month (spec 07, "Meta, atendimento"). */
export const META_FREE_REPLIES = 1_000;

export interface ExampleBill {
  plan: PlanId;
  conversations: string;
  planPrice: string;
  metaAbout: string;
  totalAbout: string;
  freeReplies: string;
  /** Share of the month's total that is the plan (the rest is Meta), for the bill's bar. */
  planPercent: number;
}

function roundedReais(cents: number): string {
  return formatBrlShort(Math.round(cents / CENTS_PER_REAL) * CENTS_PER_REAL);
}

export function exampleBill(plan: PlanId = PlanId.agenda): ExampleBill {
  const profile = META_PROFILES[EXAMPLE_PROFILE_INDEX];
  if (!profile) throw new Error('Missing Meta example profile');
  const planCents = PLANS[plan].monthlyCents;
  return {
    plan,
    conversations: formatCount(profile.conversations),
    planPrice: formatBrl(planCents),
    metaAbout: roundedReais(profile.metaCents),
    totalAbout: roundedReais(planCents + profile.metaCents),
    freeReplies: formatCount(META_FREE_REPLIES),
    planPercent: Math.round((planCents / (planCents + profile.metaCents)) * PERCENT),
  };
}
