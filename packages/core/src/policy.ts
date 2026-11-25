import * as z from 'zod';

/** Specialty policy rules (spec 01, "Expansão por especialidade"), stored as JSON per specialty. */
export const specialtyPolicySchema = z.object({
  pricesForbidden: z.boolean().default(false),
  urgencyTerms: z.array(z.string()).default([]),
  forbiddenTerms: z.array(z.string()).default([]),
});

export type SpecialtyPolicy = z.infer<typeof specialtyPolicySchema>;

export function parsePolicy(rules: unknown): SpecialtyPolicy {
  return specialtyPolicySchema.parse(rules ?? {});
}
