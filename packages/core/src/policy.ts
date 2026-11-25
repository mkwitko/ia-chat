import * as z from 'zod';

/** What the segment's conversations may touch (spec 11): `health` turns the clinical limits on. */
export const Sensitivity = { none: 'none', health: 'health' } as const;
export type Sensitivity = (typeof Sensitivity)[keyof typeof Sensitivity];

/** A tenant with no policy row keeps the strictest behavior: health, "paciente". */
export const DEFAULT_VOCABULARY = 'paciente';

/** Template policy (spec 11, "Modelo de template"), stored as JSON per template key. */
export const specialtyPolicySchema = z.object({
  pricesForbidden: z.boolean().default(false),
  urgencyTerms: z.array(z.string()).default([]),
  forbiddenTerms: z.array(z.string()).default([]),
  sensitivity: z.enum(Sensitivity).default(Sensitivity.health),
  /** What to call who is served ("cliente", "paciente", "aluno"). */
  vocabulary: z.string().default(DEFAULT_VOCABULARY),
  /** Suggested return/reminder intervals in days; empty = off until the owner turns it on. */
  followUps: z.array(z.number().int().positive()).default([]),
  /** Renames of the fixed funnel stages (system stage -> label). */
  funnelStages: z.record(z.string(), z.string()).default({}),
});

export type SpecialtyPolicy = z.infer<typeof specialtyPolicySchema>;

export function parsePolicy(rules: unknown): SpecialtyPolicy {
  return specialtyPolicySchema.parse(rules ?? {});
}
