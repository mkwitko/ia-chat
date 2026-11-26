import { Link } from 'react-router';
import { Route } from '@/routes';
import { timeLabel } from '../agenda/agenda-dates';
import { AppointmentStatusLabel } from '../customers/customers-labels';
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

/** Início's one way to the rest of the month (Resultados). */
export function ResultsLink() {
  return (
    <Link
      to={Route.results}
      className="mx-4 mt-6 flex min-h-11 w-fit items-center gap-1 font-semibold underline underline-offset-4 md:mx-0"
    >
      {Copy.seeResults}
    </Link>
  );
}
