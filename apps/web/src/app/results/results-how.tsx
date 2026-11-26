import { dateFormat } from '@/i18n/locale';
import { MoreOptions } from '../screens/editor-screen';
import { ResultsCopy as Copy } from './results-copy';

const DATE = dateFormat({ day: '2-digit', month: '2-digit', year: 'numeric' });

const EXPLAINED = [
  Copy.conversations,
  Copy.booked,
  Copy.noShow,
  Copy.firstResponse,
  Copy.newContacts,
  Copy.escalation,
  Copy.rescheduled,
  Copy.cancelled,
  Copy.recovered,
  Copy.repeatBookings,
  Copy.referrals,
] as const;

/** Every formula in one place, folded at the end of Resultados (round 3: no fine print per number). */
export function HowWeCount({ dataSince }: Readonly<{ dataSince: string | null }>) {
  const since = dataSince ? DATE.format(new Date(dataSince)) : null;
  return (
    <MoreOptions label={Copy.howTitle}>
      <p className="text-sm">{since ? Copy.baseline(since) : Copy.baselineNoDate}</p>
      <dl className="grid gap-3 text-sm">
        {EXPLAINED.map((item) => (
          <div key={item.title}>
            <dt className="font-medium">{item.title}</dt>
            <dd className="text-muted-foreground">{item.formula}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">{Copy.requestsNote}</p>
    </MoreOptions>
  );
}
