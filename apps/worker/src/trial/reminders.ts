import {
  abandonmentEmail,
  currentStep,
  lastStepAt,
  parseProgress,
  Reminder,
  reminderDue,
} from '@app/core';
import { ownerEmail } from './owner-email.ts';
import type { SweepDeps, TenantRow } from './sweep-types.ts';

const COLUMN = {
  [Reminder.first]: 'reminder1dSentAt',
  [Reminder.second]: 'reminder3dSentAt',
} as const satisfies Record<Reminder, string>;

/** The reminder due for this tenant now, or null (onboarding done, or already reminded). */
export function dueReminder(tenant: TenantRow, now: Date): Reminder | null {
  const progress = parseProgress(tenant.onboardingProgress);
  if (currentStep(progress) === null) return null;
  return reminderDue({
    lastActivityAt: lastStepAt(progress) ?? tenant.createdAt,
    now,
    sent: { first: tenant.reminder1dSentAt, second: tenant.reminder3dSentAt },
  });
}

/**
 * RF-84: at most once per stage. The claim is a conditional update before the send, so two sweeps
 * never both send; if the send fails the claim is released and the next sweep tries again.
 */
export async function remindIfDue(deps: SweepDeps, tenant: TenantRow): Promise<boolean> {
  const stage = dueReminder(tenant, deps.now);
  if (!stage) return false;
  const column = COLUMN[stage];
  const claimed = await deps.db.client.tenant.updateMany({
    where: { id: tenant.id, [column]: null },
    data: { [column]: deps.now },
  });
  if (claimed.count === 0) return false;
  const to = await ownerEmail(deps.db, tenant.id);
  if (!to) return false;
  try {
    await deps.email.send(abandonmentEmail({ to, stage, resumeUrl: deps.urls.resume }));
  } catch (error) {
    await deps.db.client.tenant.update({ where: { id: tenant.id }, data: { [column]: null } });
    throw error;
  }
  return true;
}
