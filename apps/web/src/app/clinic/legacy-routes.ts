import { LegacyRoute, Route } from '@/routes';

/** Where each old settings address lives now (owner, 26/11/2026). */
export const LEGACY_REDIRECTS: Readonly<Record<LegacyRoute, string>> = {
  [LegacyRoute.availability]: Route.clinicHours,
  [LegacyRoute.profile]: Route.clinic,
  [LegacyRoute.services]: Route.clinicServices,
  [LegacyRoute.connections]: Route.clinicWhatsapp,
  [LegacyRoute.importReview]: Route.importReview,
  [LegacyRoute.usage]: Route.usage,
  [LegacyRoute.billing]: Route.billing,
  [LegacyRoute.growth]: Route.growth,
  [LegacyRoute.referral]: Route.referral,
};

/** The new address with the old query kept (`?profissional=`, `?google=ok`). */
export const redirectTarget = (from: LegacyRoute, search: string) =>
  `${LEGACY_REDIRECTS[from]}${search}`;
