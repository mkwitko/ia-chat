/** Mirrors the Prisma TenantStatus enum: core does not depend on the database package. */
export const TenantStatusName = {
  setup: 'setup',
  trial: 'trial',
  active: 'active',
  restricted: 'restricted',
  cancelled: 'cancelled',
} as const;
