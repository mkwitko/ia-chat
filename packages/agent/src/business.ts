import type { AgentBusiness } from '@app/ai';
import { parseBusinessProfile, PAYMENT_METHOD_LABEL } from '@app/core';

interface Rows {
  team: readonly { name: string }[];
  otherPlaces: readonly { name: string; address: string; arrivalInstructions: string | null }[];
}

/** M-04: the tenant's business profile column plus its team and extra places, for the prompt. */
export function businessOf(raw: unknown, { team, otherPlaces }: Rows): AgentBusiness {
  const profile = parseBusinessProfile(raw);
  return {
    description: profile.description,
    phone: profile.phone,
    website: profile.website,
    social: profile.social,
    paymentMethods: profile.paymentMethods.map((method) => PAYMENT_METHOD_LABEL[method]),
    cancellationPolicy: profile.cancellationPolicy,
    welcomeMessage: profile.welcomeMessage,
    packages: profile.packages,
    team: team.map((member) => member.name),
    otherPlaces: otherPlaces.map((place) => ({
      name: place.name,
      address: place.address,
      ...(place.arrivalInstructions ? { arrival: place.arrivalInstructions } : {}),
    })),
  };
}
