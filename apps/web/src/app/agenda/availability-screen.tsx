import { useState } from 'react';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { Screen } from '../screens/screen';
import { feedback } from '../setup/feedback';
import { FormActions, TextField } from '../setup/fields';
import { CommonCopy } from '../setup/setup-copy';
import { AvailabilityCopy as Copy } from './agenda-copy';
import { minuteToTime, timeToMinute } from './agenda-dates';
import { useAvailability, useSaveSummaryTime } from './agenda-api';
import { CalendarSection } from '../calendar/calendar-section';
import { RulesEditor } from './rules-editor';
import { TimeOffSection } from './time-off-section';

/** Spec 10, "Agenda": availability, blocks, vacation and the nightly summary time. */
export function AvailabilityScreen() {
  const availability = useAvailability();
  return (
    <Screen title={Copy.title}>
      <BackLink to={Route.agenda} label={Copy.back} />
      {availability.isPending && <ListSkeleton />}
      {availability.isError && (
        <LoadError message={CommonCopy.loadFailed} onRetry={() => void availability.refetch()} />
      )}
      {availability.data && (
        <div className="grid gap-10 pt-2 pb-10">
          <section className="grid gap-3">
            <h2 className="px-4 text-lg md:px-0">{Copy.rulesHeading}</h2>
            <p className="px-4 text-sm text-muted-foreground md:px-0">{Copy.rulesIntro}</p>
            <RulesEditor initial={availability.data.rules} />
          </section>
          <CalendarSection />
          <TimeOffSection timezone={availability.data.timezone} />
          <SummarySection minute={availability.data.nightlySummaryMinute} />
        </div>
      )}
    </Screen>
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
