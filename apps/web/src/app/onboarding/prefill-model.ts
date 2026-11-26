import { centsToInput, parseReais } from '../../lib/money';
import type { PrefillSuggestion } from './onboarding-api';

// The review screen's draft: what was found, as the owner edits it. Nothing reaches the
// server until "Salvar o que conferi" (spec 09: nothing is saved without approval).

export const DEFAULT_SERVICE_MINUTES = 60;
const EMPTY = '';

export interface ServiceDraft {
  name: string;
  minutes: string;
  price: string;
  keep: boolean;
}

export interface ReviewDraft {
  name: string;
  description: string;
  phone: string;
  address: string;
  website: string;
  social: string;
  hours: PrefillSuggestion['hours'];
  keepHours: boolean;
  services: ServiceDraft[];
  /** Packages found with their written price; kept ones join the profile (M-04). */
  packages: (PrefillSuggestion['packages'][number] & { keep: boolean })[];
}

export type TextField = 'name' | 'description' | 'phone' | 'address' | 'website' | 'social';

/** A service is kept by default only when the page gave its price (the owner confirms it). */
export function draftOf(found: PrefillSuggestion): ReviewDraft {
  return {
    name: found.name ?? EMPTY,
    description: found.description ?? EMPTY,
    phone: found.phone ?? EMPTY,
    address: found.address ?? EMPTY,
    website: found.website ?? EMPTY,
    social: found.social ?? EMPTY,
    hours: found.hours,
    keepHours: found.hours.length > 0,
    services: found.services.map((service) => ({
      name: service.name,
      minutes: String(service.durationMinutes ?? DEFAULT_SERVICE_MINUTES),
      price: service.priceCents === null ? EMPTY : centsToInput(service.priceCents),
      keep: service.priceCents !== null,
    })),
    packages: found.packages.map((item) => ({ ...item, keep: true })),
  };
}

export interface ServiceInput {
  name: string;
  durationMinutes: number;
  priceCents: number;
  visibleToPatient: boolean;
}

/** Kept services with a valid price and duration, ready for the API; the others are skipped. */
export function servicesToSave(services: readonly ServiceDraft[]): ServiceInput[] {
  return services.flatMap((service) => {
    const priceCents = parseReais(service.price);
    const durationMinutes = Number(service.minutes);
    if (!service.keep || priceCents === null || !service.name.trim()) return [];
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) return [];
    return [{ name: service.name.trim(), durationMinutes, priceCents, visibleToPatient: true }];
  });
}

/** True when the draft has anything worth saving. */
export function hasContent(draft: ReviewDraft): boolean {
  const texts = [draft.name, draft.description, draft.phone, draft.address, draft.website];
  return (
    texts.some((value) => value.trim()) ||
    (draft.keepHours && draft.hours.length > 0) ||
    servicesToSave(draft.services).length > 0 ||
    draft.packages.some((item) => item.keep)
  );
}
