import {
  AppointmentCreator,
  localDayRange,
  MessageAuthor,
  MessageDirection,
  MIN_SAMPLE,
  recoveredMoney,
  type Tx,
} from '@app/db';
import type { WeeklyReport } from './weekly-text.ts';

const WEEK_DAYS = 7;
const ANSWERED_BY = [MessageAuthor.ai, MessageAuthor.human];

/**
 * Research 09 #2: the seven local days before today (run on Monday: last Monday to Sunday).
 * Null when the owner turned the report off. Counts only; nothing about who.
 */
export async function readWeeklyReport(
  tx: Tx,
  { tenantId, now }: { tenantId: string; now: Date },
): Promise<WeeklyReport | null> {
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { timezone: true, weeklyReport: true },
  });
  if (!tenant.weeklyReport) return null;
  const { timezone } = tenant;
  const first = localDayRange(now, timezone, -WEEK_DAYS);
  const last = localDayRange(now, timezone, -1);
  const range = { start: first.start, end: last.end };
  const created = { gte: range.start, lt: range.end };
  const [answered, booked, money, unanswered] = await Promise.all([
    tx.message.findMany({
      where: {
        direction: MessageDirection.outbound,
        author: { in: ANSWERED_BY },
        createdAt: created,
      },
      distinct: ['conversationId'],
      select: { conversationId: true },
    }),
    tx.appointment.count({ where: { createdBy: AppointmentCreator.ai, createdAt: created } }),
    recoveredMoney(tx, { range, timezone }),
    tx.knowledgeItem.count({ where: { active: true, answer: null } }),
  ]);
  return {
    from: first.day,
    to: last.day,
    answered: answered.length,
    booked,
    attended: money.count,
    valueCents: money.valueCents,
    unanswered,
    minSample: MIN_SAMPLE,
  };
}
