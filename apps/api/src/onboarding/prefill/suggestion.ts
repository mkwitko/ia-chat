import type { PrefillExtraction } from '@app/ai';
import { validWindows } from '../../agenda/availability-routes.ts';

// Spec 09 prefill: what the model read, cleaned before the owner sees it. A price survives only
// if that value is written in the page itself, so the model can never be the source of a price.

export interface PrefillSuggestion {
  name: string | null;
  description: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  social: string | null;
  hours: { weekday: number; start: string; end: string }[];
  services: { name: string; durationMinutes: number | null; priceCents: number | null }[];
  /** Only packages whose price is written in the page. */
  packages: { name: string; priceCents: number }[];
}

const Limit = {
  name: 120,
  text: 600,
  short: 120,
  url: 300,
  serviceName: 80,
  services: 20,
  minMinutes: 5,
  maxMinutes: 600,
} as const;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const HTTP_URL = /^https?:\/\/\S+$/i;
const CENTS_PER_REAL = 100;
const PT_BR = new Intl.NumberFormat('pt-BR');
const DIGIT_BEFORE = String.raw`(?<![\d.,])`;
const DIGIT_AFTER = String.raw`(?!\d|,\d)`;
const DOTS = /\./g;
const ESCAPED_DOT = String.raw`\.`;
const WHOLE_CENTS = '(?:,00)?';
const PAD = 2;
const ZERO = '0';

function text(value: string | null, max: number): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed.slice(0, max) : null;
}

/** The value written as "250", "250,00", "1.800" or "1800,50" somewhere in the source. */
export function priceWritten(source: string, cents: number): boolean {
  const reais = Math.trunc(cents / CENTS_PER_REAL);
  const rest = cents % CENTS_PER_REAL;
  const centsPart = rest === 0 ? WHOLE_CENTS : `,${String(rest).padStart(PAD, ZERO)}`;
  return [String(reais), PT_BR.format(reais)].some((whole) =>
    new RegExp(DIGIT_BEFORE + whole.replace(DOTS, ESCAPED_DOT) + centsPart + DIGIT_AFTER).test(
      source,
    ),
  );
}

function hoursOf(hours: PrefillExtraction['hours']) {
  const valid = hours.every((rule) => HHMM.test(rule.start) && HHMM.test(rule.end));
  // A broken grid is dropped whole: the owner types the hours instead of fixing a wrong guess.
  return valid && validWindows(hours) ? hours : [];
}

function servicesOf(services: PrefillExtraction['services'], source: string) {
  return services.slice(0, Limit.services).flatMap((service) => {
    const name = text(service.name, Limit.serviceName);
    if (!name) return [];
    const minutes = service.durationMinutes;
    const cents = service.priceCents;
    return [
      {
        name,
        durationMinutes:
          minutes !== null && minutes >= Limit.minMinutes && minutes <= Limit.maxMinutes
            ? minutes
            : null,
        priceCents: cents !== null && cents > 0 && priceWritten(source, cents) ? cents : null,
      },
    ];
  });
}

function packagesOf(packages: PrefillExtraction['packages'], source: string) {
  return packages.slice(0, Limit.services).flatMap((item) => {
    const name = text(item.name, Limit.serviceName);
    const cents = item.priceCents;
    if (!name || cents === null || cents <= 0 || !priceWritten(source, cents)) return [];
    return [{ name, priceCents: cents }];
  });
}

export function suggestionOf(extracted: PrefillExtraction, source: string): PrefillSuggestion {
  const website = text(extracted.website, Limit.url);
  return {
    name: text(extracted.name, Limit.name),
    description: text(extracted.description, Limit.text),
    phone: text(extracted.phone, Limit.short),
    address: text(extracted.address, Limit.url),
    website: website && HTTP_URL.test(website) ? website : null,
    social: text(extracted.social, Limit.url),
    hours: hoursOf(extracted.hours),
    services: servicesOf(extracted.services, source),
    packages: packagesOf(extracted.packages, source),
  };
}
