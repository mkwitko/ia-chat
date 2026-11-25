import { TimeOffKind } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';

/**
 * RF-14: the return instant of the vacation overlapping [from, to), if any. Slots inside it are
 * already gone (a vacation is a time off for `availableSlots`); this only feeds the notice.
 * ponytail: back-to-back vacations report the first one's end.
 */
export async function vacationReturn(
  tx: Tx,
  window: { from: Date; to: Date },
): Promise<Date | null> {
  const found = await tx.timeOff.findFirst({
    where: { kind: TimeOffKind.vacation, startsAt: { lt: window.to }, endsAt: { gt: window.from } },
    orderBy: { startsAt: 'asc' },
  });
  return found?.endsAt ?? null;
}
