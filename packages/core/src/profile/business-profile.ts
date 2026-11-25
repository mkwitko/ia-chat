import * as z from 'zod';

// M-04 (spec 11): the business profile. One JSON column on the tenant (`business_profile`),
// read by the assistant's prompt; prices of packages in whole cents, never from the model.

export const PaymentMethod = {
  pix: 'pix',
  credit: 'credit_card',
  debit: 'debit_card',
  cash: 'cash',
  transfer: 'bank_transfer',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

/** How the assistant and the panel name each payment method. */
export const PAYMENT_METHOD_LABEL: Readonly<Record<PaymentMethod, string>> = {
  [PaymentMethod.pix]: 'Pix',
  [PaymentMethod.credit]: 'cartão de crédito',
  [PaymentMethod.debit]: 'cartão de débito',
  [PaymentMethod.cash]: 'dinheiro',
  [PaymentMethod.transfer]: 'transferência bancária',
};

export const PROFILE_LIMITS = {
  text: 600,
  short: 120,
  url: 300,
  welcome: 1_000,
  packages: 20,
  packageName: 80,
} as const;

const HTTP_URL = /^https?:\/\//i;
const optionalText = (max: number) => z.string().trim().max(max).optional();
const httpUrl = z.url().max(PROFILE_LIMITS.url).regex(HTTP_URL).optional();

export const packageSchema = z
  .object({
    name: z.string().trim().min(1).max(PROFILE_LIMITS.packageName),
    priceCents: z.int().min(0),
  })
  .strict();
export type BusinessPackage = z.infer<typeof packageSchema>;

export const businessProfileSchema = z
  .object({
    description: optionalText(PROFILE_LIMITS.text),
    phone: optionalText(PROFILE_LIMITS.short),
    website: httpUrl,
    social: optionalText(PROFILE_LIMITS.url),
    /** Google review link the owner shares after a visit (checklist on Início). */
    reviewLink: httpUrl,
    paymentMethods: z.array(z.enum(PaymentMethod)).default([]),
    /** Free text next to the minutes rule (`tenants.cancel_notice_minutes`). */
    cancellationPolicy: optionalText(PROFILE_LIMITS.text),
    /** The welcome message the owner uses today; Meta does not import it (spec 09). */
    welcomeMessage: optionalText(PROFILE_LIMITS.welcome),
    packages: z.array(packageSchema).max(PROFILE_LIMITS.packages).default([]),
  })
  .strict();
export type BusinessProfile = z.infer<typeof businessProfileSchema>;

const EMPTY: BusinessProfile = { paymentMethods: [], packages: [] };

/** The stored column as a profile; a broken value reads as empty so the assistant keeps working. */
export function parseBusinessProfile(raw: unknown): BusinessProfile {
  const parsed = businessProfileSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : { ...EMPTY };
}
