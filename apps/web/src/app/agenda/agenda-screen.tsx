import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { NavCopy } from '@/copy';
import { useMedia, WIDE_QUERY } from '@/lib/use-media';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { Screen } from '../screens/screen';
import { AgendaBody } from './agenda-body';
import { AgendaCopy as Copy } from './agenda-copy';
import { useAgenda, type AgendaView } from './agenda-api';
import { AgendaToolbar, DAY_PARAM, VIEW_PARAM, View, WEEK_DAYS } from './agenda-toolbar';
import { BookingForm, BookingKind, type BookingTarget } from './booking-form';
import { PROFESSIONAL_PARAM } from './professional-api';
import { ProfessionalFilter } from './professional-controls';

const NEW_PARAM = 'novo';
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
    professionalId: params.get(PROFESSIONAL_PARAM) ?? '',
    days: view === View.week ? WEEK_DAYS : 1,
    change: (next: Record<string, string>) => {
      setParams({ ...Object.fromEntries(params), ...next }, { replace: true });
    },
  };
}

/** Spec 10, "Agenda": the day on the phone, the week as seven day columns on the computer. */
export function AgendaScreen() {
  const { view, requested, days, change, professionalId } = useAgendaParams();
  const agenda = useAgenda(ISO_DAY.test(requested) ? requested : undefined, days);
  const day = agenda.data?.from ?? requested;
  // `?novo=1` (Início's shortcut) opens the booking form straight away.
  const [booking, setBooking] = useState<BookingTarget | null>(() =>
    new URLSearchParams(location.search).has(NEW_PARAM)
      ? { kind: BookingKind.new, day, professionalId }
      : null,
  );
  const team = agenda.data?.professionals ?? [];
  const shown = agenda.data && onlyOf(agenda.data, professionalId);
  const names = team.length > 1 && !professionalId ? namesOf(team) : undefined;
  return (
    <Screen title={NavCopy.agenda}>
      <AgendaToolbar
        day={day}
        view={view}
        onChange={change}
        onNew={() => {
          setBooking({ kind: BookingKind.new, day, professionalId });
        }}
      />
      {team.length > 1 && <TeamFilter team={team} value={professionalId} onChange={change} />}
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
      {shown && <AgendaBody agenda={shown} days={days} onNew={setBooking} names={names} />}
    </Screen>
  );
}

/** One professional's appointments and time offs; '' keeps everyone's. */
function onlyOf(agenda: AgendaView, professionalId: string): AgendaView {
  if (!professionalId) return agenda;
  const mine = (item: { professionalId: string }) => item.professionalId === professionalId;
  return {
    ...agenda,
    appointments: agenda.appointments.filter(mine),
    timeOffs: agenda.timeOffs.filter(mine),
  };
}

const namesOf = (team: AgendaView['professionals']) =>
  new Map(team.map((one) => [one.id, one.name]));

interface TeamFilterProps {
  team: AgendaView['professionals'];
  value: string;
  onChange: (next: Record<string, string>) => void;
}

/** Clínica: everyone's agenda or one professional's (spec 10, "Agenda"). */
function TeamFilter({ team, value, onChange }: Readonly<TeamFilterProps>) {
  return (
    <div className="py-3 md:-mt-2 md:mb-6 md:py-0">
      <ProfessionalFilter
        professionals={team}
        value={value}
        withAll
        onChange={(id) => {
          onChange({ [PROFESSIONAL_PARAM]: id });
        }}
      />
    </div>
  );
}
