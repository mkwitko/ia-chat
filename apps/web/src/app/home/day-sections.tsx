import { Link } from 'react-router';
import { customerPath, Route } from '@/routes';
import { timeLabel } from '../agenda/agenda-dates';
import { customerName } from '../customers/customer-format';
import { OriginLabel } from '../customers/customers-labels';
import { CardList, Note, Section } from '../screens/section';
import { AppointmentStatusLabel } from '../customers/customers-labels';
import { HomeCopy as Copy } from './home-copy';
import type { HomeView } from './home-api';

const ROW_CLASS =
  'flex min-h-[64px] items-center gap-3 px-4 py-2 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring';
const LINK_CLASS = 'flex min-h-11 items-center px-4 text-sm font-semibold text-primary md:px-0';

/** Today's appointments, in the tenant's timezone. */
export function TodaySection({ home }: Readonly<{ home: HomeView }>) {
  return (
    <Section title={Copy.todayHeading}>
      {home.today.length === 0 && <Note>{Copy.todayEmpty}</Note>}
      <CardList>
        {home.today.map((item) => (
          <li key={item.id}>
            <Link to={Route.agenda} className={ROW_CLASS}>
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
    </Section>
  );
}

/** People who talked and did not book, with how many can still be picked up. */
export function NotBookedSection({ home }: Readonly<{ home: HomeView }>) {
  const { count, recoverable, items } = home.notBooked;
  return (
    <Section title={Copy.notBookedHeading}>
      <Note>
        {count === 0
          ? Copy.notBookedEmpty
          : `${Copy.notBookedCount(count)} ${Copy.recoverable(recoverable)}`}
      </Note>
      {count > 0 && <Note>{Copy.recoverableHint}</Note>}
      <CardList>
        {items.map((item) => (
          <li key={item.id}>
            <Link to={customerPath(item.id)} className={ROW_CLASS}>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{customerName(item)}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {OriginLabel[item.origin]}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </CardList>
      {count > items.length && (
        <Link to={Route.customers} className={LINK_CLASS}>
          {Copy.seeAllCustomers}
        </Link>
      )}
    </Section>
  );
}
