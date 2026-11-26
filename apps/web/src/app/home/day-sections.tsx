import { CalendarPlus, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCents } from '@/lib/money';
import { Route } from '@/routes';
import { timeLabel } from '../agenda/agenda-dates';
import { AppointmentStatusLabel } from '../customers/customers-labels';
import { moneyOf, Shown } from '../results/results-model';
import { CardList, Note, Section } from '../screens/section';
import { ROW_LINK } from './attention-section';
import { HomeCopy as Copy } from './home-copy';
import type { HomeView } from './home-api';

export const NEW_BOOKING_PATH = `${Route.agenda}?novo=1`;

/** Today's appointments, in the tenant's timezone. */
export function TodaySection({ home }: Readonly<{ home: HomeView }>) {
  const asked = new Set(home.attention.toMark.map((item) => item.id));
  const upcoming = home.today.filter((item) => !asked.has(item.id));
  const empty = home.today.length === 0 ? Copy.todayEmpty : Copy.todayDone;
  return (
    <Section title={Copy.todayHeading}>
      {upcoming.length === 0 && <Note>{empty}</Note>}
      {upcoming.length > 0 && (
        <CardList>
          {upcoming.map((item) => (
            <li key={item.id}>
              <Link to={Route.agenda} className={ROW_LINK}>
                <span className="w-14 shrink-0 font-semibold tabular-nums">
                  {timeLabel(item.startsAt, home.timezone)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {item.patientName ?? Copy.noPatient}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {item.serviceName} · {AppointmentStatusLabel[item.status] ?? item.status}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </CardList>
      )}
    </Section>
  );
}

const QUICK = [
  { to: NEW_BOOKING_PATH, label: Copy.quick.newBooking, icon: CalendarPlus },
  { to: Route.simulator, label: Copy.quick.tryAssistant, icon: Sparkles },
] as const;

/** Three shortcuts to what is done most often from Início. */
export function QuickActions({ className }: Readonly<{ className?: string }>) {
  return (
    <nav
      aria-label={Copy.quick.label}
      className={cn('grid gap-2 px-4 sm:grid-cols-2 md:px-0 xl:grid-cols-1', className)}
    >
      {QUICK.map(({ to, label, icon: Icon }) => (
        <Button key={to} asChild variant="outline" className="justify-start">
          <Link to={to}>
            <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
            {label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}

/** The month in one sentence, with the way to the full numbers. */
export function MonthSummary({ home }: Readonly<{ home: HomeView }>) {
  const { recovered, month } = home;
  const money = moneyOf(recovered.count, recovered.valueCents, recovered.minSample);
  return (
    <Section title={Copy.monthHeading}>
      <Note>{Copy.month(month.contacts, month.booked)}</Note>
      {money.kind === Shown.ok && <Note>{Copy.recovered(formatCents(money.cents))}</Note>}
      <Link
        to={Route.results}
        className="flex min-h-11 w-fit items-center px-4 font-semibold underline underline-offset-4 md:px-0"
      >
        {Copy.seeResults}
      </Link>
    </Section>
  );
}
