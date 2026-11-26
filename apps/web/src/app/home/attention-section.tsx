import { Link } from 'react-router';
import { customerPath, Route } from '@/routes';
import { AttendanceButtons } from '../customers/attendance-buttons';
import { dayOf, shortDay, timeLabel } from '../agenda/agenda-dates';
import { ConversationRow } from '../inbox/conversation-row';
import { CardList, Section } from '../screens/section';
import { HomeCopy as Copy } from './home-copy';
import type { EndingPackage, HomeAppointment, HomeView } from './home-api';

export const hasAttention = ({ attention, toConfirm }: HomeView) =>
  attention.conversations.length > 0 ||
  attention.drafts > 0 ||
  attention.unanswered > 0 ||
  attention.toMark.length > 0 ||
  attention.endingPackages.length > 0 ||
  toConfirm.length > 0;

const LINK_CLASS =
  'flex min-h-11 items-center px-4 py-2 text-base font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring';

function CountLink({ to, label }: Readonly<{ to: string; label: string }>) {
  return (
    <li>
      <Link to={to} className={LINK_CLASS}>
        {label}
      </Link>
    </li>
  );
}

/** Spec 10, "Início": only what needs the owner; empty items are not shown. */
export function AttentionSection({ home }: Readonly<{ home: HomeView }>) {
  const { attention, toConfirm } = home;
  return (
    <Section title={Copy.attentionHeading}>
      {!hasAttention(home) && (
        <p role="status" className="px-4 text-sm text-muted-foreground md:px-0">
          {Copy.allClear}
        </p>
      )}
      <CardList>
        {attention.conversations.map((item) => (
          <li key={item.id}>
            <ConversationRow item={item} />
          </li>
        ))}
        {attention.drafts > 0 && (
          <CountLink to={Route.conversations} label={Copy.drafts(attention.drafts)} />
        )}
        {attention.unanswered > 0 && (
          <CountLink to={Route.knowledge} label={Copy.unanswered(attention.unanswered)} />
        )}
        {toConfirm.length > 0 && (
          <CountLink to={Route.agenda} label={Copy.toConfirm(toConfirm.length)} />
        )}
      </CardList>
      {attention.toMark.length > 0 && <ToMark items={attention.toMark} timezone={home.timezone} />}
      {attention.endingPackages.length > 0 && <Ending items={attention.endingPackages} />}
    </Section>
  );
}

function ToMark({
  items,
  timezone,
}: Readonly<{ items: readonly HomeAppointment[]; timezone: string }>) {
  return (
    <>
      <h3 className="px-4 pt-4 pb-2 text-base md:px-0">{Copy.toMarkHeading}</h3>
      <CardList>
        {items.map((item) => (
          <li key={item.id} className="grid gap-2 px-4 py-3">
            <Link
              to={Route.agenda}
              className="grid min-h-11 content-center hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="font-semibold">{item.patientName ?? Copy.noPatient}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {shortDay(dayOf(item.startsAt, timezone))} {timeLabel(item.startsAt, timezone)} ·{' '}
                {item.serviceName}
              </span>
            </Link>
            <AttendanceButtons appointmentId={item.id} />
          </li>
        ))}
      </CardList>
    </>
  );
}

/** Research 09 #7: the client's latest package with one session left or just used up. */
function Ending({ items }: Readonly<{ items: readonly EndingPackage[] }>) {
  return (
    <>
      <h3 className="px-4 pt-4 pb-2 text-base md:px-0">{Copy.endingHeading}</h3>
      <CardList>
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={customerPath(item.contactId)}
              className="grid min-h-11 content-center px-4 py-2 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span className="font-semibold">{item.contactName ?? Copy.noPatient}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {Copy.ending(item.name, item.remaining)}
              </span>
            </Link>
          </li>
        ))}
      </CardList>
    </>
  );
}
