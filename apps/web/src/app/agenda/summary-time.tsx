import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { feedback } from '../setup/feedback';
import { TextField } from '../setup/fields';
import { CommonCopy } from '../setup/setup-copy';
import { AvailabilityCopy as Copy } from './agenda-copy';
import { minuteToTime, timeToMinute } from './agenda-dates';
import { useAvailability, useSaveSummaryTime } from './agenda-api';

/** RF-15: the time of the nightly "Sua agenda de amanhã" notification (Conta › Avisos, round 3). */
export function NightlySummary() {
  const minute = useAvailability().data?.nightlySummaryMinute;
  if (minute === undefined) return null;
  return <SummaryForm minute={minute} />;
}

function SummaryForm({ minute }: Readonly<{ minute: number }>) {
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
