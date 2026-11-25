import { AgendaCopy as Copy } from './agenda-copy';
import { lastDayOf, shortDay } from './agenda-dates';
import { TimeOffKind, type TimeOffItem } from './agenda-api';

/** A block or vacation covering the day: no slots are offered inside it. */
export function TimeOffNote({ off, timezone }: Readonly<{ off: TimeOffItem; timezone: string }>) {
  const vacation = off.kind === TimeOffKind.vacation;
  return (
    <p className="mx-4 rounded-lg bg-attention-soft px-3 py-2 text-sm md:mx-0">
      <span className="font-semibold">{vacation ? Copy.vacation : Copy.block}</span>
      {vacation && ` até ${shortDay(lastDayOf(off.endsAt, timezone))}`}
      {off.reason && ` · ${off.reason}`}
    </p>
  );
}
