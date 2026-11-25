import { DATA_RETENTION_DAYS, trialEndedEmail } from '@app/core';
import { Autonomy, TenantStatus } from '@app/db';
import { ownerEmail } from './owner-email.ts';
import type { SweepDeps } from './sweep-types.ts';

const DISPLAY_LOCALE = 'pt-BR';
const DISPLAY_TZ = 'America/Sao_Paulo';
const MS_PER_DAY = 86_400_000;

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat(DISPLAY_LOCALE, { timeZone: DISPLAY_TZ }).format(date);

/**
 * RF-88: the assistant goes to "desligado" (the fixed away message flow takes over) and the data
 * stays for 30 days. The claim is one conditional update, so a repeated sweep does nothing.
 * Returns false when another run already ended this trial.
 */
export async function endTrial(deps: SweepDeps, tenantId: string): Promise<boolean> {
  const { db, now } = deps;
  const claimed = await db.client.tenant.updateMany({
    where: { id: tenantId, trialEndedAt: null, status: TenantStatus.trial },
    data: { trialEndedAt: now, status: TenantStatus.restricted, autonomy: Autonomy.off },
  });
  if (claimed.count === 0) return false;
  const to = await ownerEmail(db, tenantId);
  if (to) {
    const keptUntil = formatDate(new Date(now.getTime() + DATA_RETENTION_DAYS * MS_PER_DAY));
    await deps.email.send(trialEndedEmail({ to, panelUrl: deps.urls.panel, keptUntil }));
  }
  return true;
}
