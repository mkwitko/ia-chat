import * as z from 'zod';

const SANDBOX_URL = 'https://api-sandbox.asaas.com/v3';

const optionalText = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed?.length ? trimmed : undefined;
  });

/** Asaas (E-25). Without ASAAS_API_KEY billing is off: the panel says so and nothing is charged. */
export const billingEnvSchema = z.object({
  ASAAS_API_KEY: optionalText,
  /** Sandbox by default: production must be chosen on purpose. */
  ASAAS_BASE_URL: optionalText.transform((value) => value ?? SANDBOX_URL).pipe(z.url()),
  /** Token we set on the Asaas webhook; it comes back in the `asaas-access-token` header. */
  ASAAS_WEBHOOK_TOKEN: optionalText,
});
