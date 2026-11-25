import { buildFunnel } from '@app/core';
import type { Db } from '@app/db';

/** RF-86: the funnel over every tenant. Reads only the progress column: no names, no contacts. */
export async function funnelOf(db: Db) {
  const tenants = await db.client.tenant.findMany({ select: { onboardingProgress: true } });
  return buildFunnel(tenants.map((tenant) => tenant.onboardingProgress));
}
