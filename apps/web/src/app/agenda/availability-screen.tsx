import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { Screen, ScreenWidth } from '../screens/screen';
import { feedback } from '../setup/feedback';
import { FormActions, TextField } from '../setup/fields';
import { CommonCopy } from '../setup/setup-copy';
import { AvailabilityCopy as Copy } from './agenda-copy';
import { minuteToTime, timeToMinute } from './agenda-dates';
import { useAvailability, useSaveSummaryTime } from './agenda-api';
import { CalendarSection } from '../calendar/calendar-section';
import { RulesEditor } from './rules-editor';
import { TimeOffSection } from './time-off-section';
import { useProfessionals } from '../profile/profile-api';
import { PROFESSIONAL_PARAM } from './professional-api';
import { ProfessionalFilter } from './professional-controls';
import { ProfessionalCopy } from './professional-copy';
import { ProfessionalServices } from './professional-services';

/** The professional in `?profissional=` (default: the first) and the team to switch between. */
function useChosenProfessional() {
  const [params, setParams] = useSearchParams();
  const team = useProfessionals().data?.professionals ?? [];
  const asked = params.get(PROFESSIONAL_PARAM);
  const chosen = team.find((one) => one.id === asked) ?? team[0];
  return {
    team,
    chosen,
    choose: (id: string) => {
      setParams({ [PROFESSIONAL_PARAM]: id }, { replace: true });
    },
  };
}

/**
 * Spec 10, "Agenda": availability, blocks, vacation and the nightly summary time. With more than
 * one professional (Clínica), each has their own hours, services and blocks (spec 05).
 */
export function AvailabilityScreen() {
  const { team, chosen, choose } = useChosenProfessional();
  const availability = useAvailability(chosen?.id);
  const several = team.length > 1;
  const [owner] = team;
  return (
    <Screen title={Copy.title} width={ScreenWidth.form}>
      <BackLink to={Route.agenda} label={Copy.back} />
      {several && chosen && (
        <ProfessionalFilter professionals={team} value={chosen.id} onChange={choose} />
      )}
      {availability.isPending && <ListSkeleton />}
      {availability.isError && (
        <LoadError message={CommonCopy.loadFailed} onRetry={() => void availability.refetch()} />
      )}
      {availability.data && (
        <div className="grid gap-10 pt-2 pb-10">
          <section className="grid gap-3">
            <h2 className="px-4 text-lg md:px-0">
              {several && chosen ? ProfessionalCopy.hoursFor(chosen.name) : Copy.rulesHeading}
            </h2>
            <p className="px-4 text-sm text-muted-foreground md:px-0">{Copy.rulesIntro}</p>
            <RulesEditor
              key={chosen?.id}
              initial={availability.data.rules}
              professionalId={chosen?.id}
            />
          </section>
          {several && chosen && <ProfessionalServices key={chosen.id} professionalId={chosen.id} />}
          <CalendarOrNote owner={owner?.name} elsewhere={chosen?.id !== owner?.id} />
          <TimeOffSection timezone={availability.data.timezone} professionalId={chosen?.id} />
          <SummarySection minute={availability.data.nightlySummaryMinute} />
        </div>
      )}
    </Screen>
  );
}

/** H-42: the connected Google Agenda is the first professional's; the others use this page only. */
function CalendarOrNote({
  owner,
  elsewhere,
}: Readonly<{ owner: string | undefined; elsewhere: boolean }>) {
  if (!owner || !elsewhere) return <CalendarSection />;
  return (
    <p className="px-4 text-sm text-muted-foreground md:px-0">
      {ProfessionalCopy.calendarElsewhere(owner)}
    </p>
  );
}

/** RF-15: the time of the nightly "Sua agenda de amanhã" notification. */
function SummarySection({ minute }: Readonly<{ minute: number }>) {
  const [time, setTime] = useState(minuteToTime(minute));
  const save = useSaveSummaryTime();
  return (
    <form
      className="grid gap-3 px-4 md:px-0"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(timeToMinute(time), feedback);
      }}
    >
      <h2 className="text-lg">{Copy.summaryHeading}</h2>
      <p className="text-sm text-muted-foreground">{Copy.summaryIntro}</p>
      <TextField
        id="summary-time"
        label={Copy.summaryTime}
        type="time"
        required
        value={time}
        onChange={setTime}
      />
      <FormActions pending={save.isPending} disabled={!time} />
    </form>
  );
}
