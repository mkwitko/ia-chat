import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { customerPath, Route } from '@/routes';
import { AttendanceButtons } from '../customers/attendance-buttons';
import { dayOf, shortDay, timeLabel } from '../agenda/agenda-dates';
import { ConversationRow } from '../inbox/conversation-row';
import { InboxState } from '../inbox/inbox-api';
import { CardList, Note, Section } from '../screens/section';
import { HomeCopy as Copy } from './home-copy';
import type { HomeView } from './home-api';

export const hasAttention = ({ attention, toConfirm, notBooked }: HomeView) =>
  attention.conversations.length > 0 ||
  attention.drafts > 0 ||
  attention.unanswered > 0 ||
  attention.toMark.length > 0 ||
  attention.endingPackages.length > 0 ||
  toConfirm.length > 0 ||
  notBooked.recoverable > 0;

const TO_MARK_SHOWN = 3;

export const ROW_LINK =
  'flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring';

function CountLink({ to, label }: Readonly<{ to: string; label: string }>) {
  return (
    <li>
      <Link to={to} className={`${ROW_LINK} font-medium`}>
        <span className="flex-1">{label}</span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** The count lines under the conversations, only those with something in them. */
function countsOf({ attention, toConfirm, notBooked }: HomeView) {
  // Drafts already listed as conversation rows are not counted twice.
  const listedDrafts = attention.conversations.filter(
    (item) => item.state === InboxState.awaitingApproval,
  ).length;
  return [
    {
      to: Route.conversations,
      show: attention.drafts > listedDrafts,
      label: Copy.drafts(attention.drafts - listedDrafts),
    },
    { to: Route.agenda, show: toConfirm.length > 0, label: Copy.toConfirm(toConfirm.length) },
    {
      to: Route.knowledge,
      show: attention.unanswered > 0,
      label: Copy.unanswered(attention.unanswered),
    },
    {
      to: Route.customers,
      show: notBooked.recoverable > 0,
      label: Copy.notBooked(notBooked.recoverable),
    },
  ].filter((item) => item.show);
}

/** Spec 10, "Início": only what needs the owner, one list; empty items are not shown. */
export function AttentionSection({ home }: Readonly<{ home: HomeView }>) {
  const { attention } = home;
  const counts = countsOf(home);
  if (attention.conversations.length === 0 && counts.length === 0)
    return (
      <Section title={Copy.attentionHeading}>
        <Note>{Copy.allClear}</Note>
      </Section>
    );
  return (
    <Section title={Copy.attentionHeading}>
      <CardList>
        {attention.conversations.map((item) => (
          <li key={item.id}>
            <ConversationRow item={item} inNeedsYouList />
          </li>
        ))}
        {counts.map((item) => (
          <CountLink key={item.to} to={item.to} label={item.label} />
        ))}
      </CardList>
    </Section>
  );
}

/** Past appointments still without "Compareceu/Faltou", the first few with the buttons. */
export function ToMarkSection({ home }: Readonly<{ home: HomeView }>) {
  const items = home.attention.toMark.slice(0, TO_MARK_SHOWN);
  const { timezone } = home;
  if (items.length === 0) return null;
  return (
    <>
      <h2 className="px-4 pt-6 pb-2 text-lg md:px-0">{Copy.toMarkHeading}</h2>
      <CardList>
        {items.map((item) => (
          <li
            key={item.id}
            className="grid gap-2 px-4 py-3 sm:flex sm:items-center sm:justify-between"
          >
            <span className="grid">
              <span className="font-semibold">{item.patientName ?? Copy.noPatient}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {shortDay(dayOf(item.startsAt, timezone))} {timeLabel(item.startsAt, timezone)} ·{' '}
                {item.serviceName}
              </span>
            </span>
            <AttendanceButtons appointmentId={item.id} />
          </li>
        ))}
      </CardList>
    </>
  );
}

/** Research 09 #7: the client's latest package with one session left or just used up. */
export function EndingSection({ home }: Readonly<{ home: HomeView }>) {
  const items = home.attention.endingPackages;
  if (items.length === 0) return null;
  return (
    <>
      <h2 className="px-4 pt-6 pb-2 text-lg md:px-0">{Copy.endingHeading}</h2>
      <CardList>
        {items.map((item) => (
          <li key={item.id}>
            <Link to={customerPath(item.contactId)} className={ROW_LINK}>
              <span className="grid flex-1">
                <span className="font-semibold">{item.contactName ?? Copy.noPatient}</span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {Copy.ending(item.name, item.remaining)}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </CardList>
    </>
  );
}
