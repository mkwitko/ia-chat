import { REFERRAL_DEFAULT_SITE, newReferralCode, referralLink } from '@app/core';
import type { Tx } from '@app/db';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { tenantOf } from '../setup/guarded.ts';

// M-11 (spec 11, "Modelo de indicação"): this business's code and link, and how many waitlist
// sign-ups came with the code. The owner shares the link by their own means. This module only
// reads and counts: it never sends a message to anyone (there is a test for that).

const PATH = '/api/growth/referral';

export interface ReferralDeps {
  /** SITE_ORIGIN; the public site when not configured. */
  siteOrigin: string | undefined;
}

export function registerReferralRoutes(app: FastifyInstance, deps: ReferralDeps): void {
  const origin = deps.siteOrigin ?? REFERRAL_DEFAULT_SITE;
  app.get(PATH, { preHandler: requireTenant(Permission.assistantManage) }, (request) =>
    readReferral(request, origin),
  );
}

async function readReferral(request: FastifyRequest, siteOrigin: string) {
  const tenant = tenantOf(request);
  return tenant.withTenant(async (tx) => {
    const code = await codeOf(tx, tenant.tenantId);
    const signups = await tx.waitlistEntry.count({ where: { referralCode: code } });
    return { code, link: referralLink(siteOrigin, code), signups };
  });
}

/** The business's code, created on first use (the unique index guards the rare repeat). */
async function codeOf(tx: Tx, tenantId: string): Promise<string> {
  const { referralCode } = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { referralCode: true },
  });
  if (referralCode) return referralCode;
  const code = newReferralCode();
  await tx.tenant.update({ where: { id: tenantId }, data: { referralCode: code } });
  return code;
}
