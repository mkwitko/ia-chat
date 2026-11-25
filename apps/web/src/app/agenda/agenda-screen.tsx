import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { NavCopy } from '@/copy';
import { useMedia, WIDE_QUERY } from '@/lib/use-media';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { Screen } from '../screens/screen';
import { AgendaBody } from './agenda-body';
import { AgendaCopy as Copy } from './agenda-copy';
import { useAgenda } from './agenda-api';
import { AgendaToolbar, DAY_PARAM, VIEW_PARAM, View, WEEK_DAYS } from './agenda-toolbar';
import { BookingForm, BookingKind, type BookingTarget } from './booking-form';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The day and view in the URL (`?dia=2027-01-04&visao=semana`), so a push link opens the right day. */
function useAgendaParams() {
  const [params, setParams] = useSearchParams();
  const requested = params.get(DAY_PARAM) ?? '';
  // The computer opens on the week (more than one day in view); the phone on the day.
  const fallback = useMedia(WIDE_QUERY) ? View.week : View.day;
  const asked = params.get(VIEW_PARAM);
  const view = asked === View.week || asked === View.day ? asked : fallback;
  return {
    view,
    requested,
    days: view === View.week ? WEEK_DAYS : 1,
    change: (next: Record<string, string>) => {
      setParams({ ...Object.fromEntries(params), ...next }, { replace: true });
    },
  };
}

/** Spec 10, "Agenda": the day on the phone, the week as seven day columns on the computer. */
export function AgendaScreen() {
  const { view, requested, days, change } = useAgendaParams();
  const agenda = useAgenda(ISO_DAY.test(requested) ? requested : undefined, days);
  const [booking, setBooking] = useState<BookingTarget | null>(null);
  const day = agenda.data?.from ?? requested;
  return (
    <Screen title={NavCopy.agenda}>
      <AgendaToolbar
        day={day}
        view={view}
        onChange={change}
        onNew={() => {
          setBooking({ kind: BookingKind.new, day });
        }}
      />
      {booking && agenda.data && (
        <BookingForm
          target={booking}
          timezone={agenda.data.timezone}
          onClose={() => {
            setBooking(null);
          }}
        />
      )}
      {agenda.isPending && <ListSkeleton />}
      {agenda.isError && (
        <LoadError message={Copy.loadFailed} onRetry={() => void agenda.refetch()} />
      )}
      {agenda.data && <AgendaBody agenda={agenda.data} days={days} onNew={setBooking} />}
    </Screen>
  );
}
