import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { NavCopy } from '@/copy';
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
  const view = params.get(VIEW_PARAM) === View.week ? View.week : View.day;
  return {
    view,
    requested,
    days: view === View.week ? WEEK_DAYS : 1,
    change: (next: Record<string, string>) => {
      setParams({ ...Object.fromEntries(params), ...next }, { replace: true });
    },
  };
}

/** Spec 10, "Agenda": the day on the phone, the week as seven day sections. */
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
