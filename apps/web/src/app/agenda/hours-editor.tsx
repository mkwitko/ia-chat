import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EditorScreen, MoreOptions } from '../screens/editor-screen';
import { ClinicCopy, EditorCopy } from '../clinic/clinic-copy';
import { feedback } from '../setup/feedback';
import { Button } from '@/components/ui/button';
import { TextField } from '../setup/fields';
import { CommonCopy } from '../setup/setup-copy';
import { AvailabilityCopy as Copy } from './agenda-copy';
import { minuteToTime, timeToMinute } from './agenda-dates';
import { useAvailability, useSaveSummaryTime } from './agenda-api';
import { RulesEditor } from './rules-editor';
import { TimeOffSection } from './time-off-section';
import { useProfessionals } from '../profile/profile-api';
import { PROFESSIONAL_PARAM } from './professional-api';
import { ProfessionalFilter } from './professional-controls';
import { ProfessionalCopy } from './professional-copy';
import { ProfessionalServices } from './professional-services';

const BACK = { to: Route.clinic, label: ClinicCopy.back };

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
 * Meu consultório › Horários (owner, 26/11/2026; was Agenda › Disponibilidade): the week, days
 * off and, folded, the time of the nightly summary. With more than one professional (Clínica),
 * each has their own hours, services and days off (spec 05).
 */
export function HoursEditor() {
  const { team, chosen, choose } = useChosenProfessional();
  const availability = useAvailability(chosen?.id);
  const several = team.length > 1;
  return (
    <EditorScreen title={ClinicCopy.hours} intro={EditorCopy.hoursIntro} back={BACK}>
      {several && chosen && (
        <div className="-mx-4 md:mx-0">
          <ProfessionalFilter professionals={team} value={chosen.id} onChange={choose} />
        </div>
      )}
      {availability.isPending && <ListSkeleton />}
      {availability.isError && (
        <LoadError message={CommonCopy.loadFailed} onRetry={() => void availability.refetch()} />
      )}
      {availability.data && (
        <div className="grid gap-10">
          <section className="grid gap-3">
            {several && chosen && (
              <h2 className="text-lg">{ProfessionalCopy.hoursFor(chosen.name)}</h2>
            )}
            <RulesEditor
              key={chosen?.id}
              initial={availability.data.rules}
              professionalId={chosen?.id}
            />
          </section>
          {several && chosen && <ProfessionalServices key={chosen.id} professionalId={chosen.id} />}
          <TimeOffSection timezone={availability.data.timezone} professionalId={chosen?.id} />
          <MoreOptions>
            <SummarySection minute={availability.data.nightlySummaryMinute} />
          </MoreOptions>
        </div>
      )}
    </EditorScreen>
  );
}

/** RF-15: the time of the nightly "Sua agenda de amanhã" notification. */
function SummarySection({ minute }: Readonly<{ minute: number }>) {
  const [time, setTime] = useState(minuteToTime(minute));
  const save = useSaveSummaryTime();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(timeToMinute(time), feedback);
      }}
    >
      <h2 className="font-medium">{Copy.summaryHeading}</h2>
      <p className="text-sm text-muted-foreground">{Copy.summaryIntro}</p>
      <TextField
        id="summary-time"
        label={Copy.summaryTime}
        type="time"
        required
        value={time}
        onChange={setTime}
      />
      <Button
        type="submit"
        variant="outline"
        className="justify-self-start"
        disabled={save.isPending || !time}
      >
        {save.isPending ? CommonCopy.saving : CommonCopy.save}
      </Button>
    </form>
  );
}
