import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormActions, TextField } from '../setup/fields';
import { AvailabilityCopy as Copy } from './agenda-copy';
import { TimeOffKind, type TimeOffInput } from './agenda-api';

interface FormProps {
  pending: boolean;
  onSubmit: (input: TimeOffInput) => void;
  onCancel: () => void;
}

/** A block (days or hours) or a vacation (whole days). The last day is included. */
export function TimeOffForm({ pending, onSubmit, onCancel }: Readonly<FormProps>) {
  const [kind, setKind] = useState<TimeOffKind>(TimeOffKind.block);
  const [fromDay, setFromDay] = useState('');
  const [toDay, setToDay] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [reason, setReason] = useState('');
  const block = kind === TimeOffKind.block;
  const times = block ? { ...(fromTime && { fromTime }), ...(toTime && { toTime }) } : {};
  return (
    <form
      className="grid gap-4 rounded-xl border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ kind, fromDay, toDay, reason: reason.trim() || null, ...times });
      }}
    >
      <KindSwitch kind={kind} onChange={setKind} />
      {!block && <p className="text-sm text-muted-foreground">{Copy.vacationHint}</p>}
      <DayFields from={[fromDay, setFromDay]} to={[toDay, setToDay]} />
      {block && <TimeFields from={[fromTime, setFromTime]} to={[toTime, setToTime]} />}
      <TextField
        id="off-reason"
        label={Copy.reason}
        placeholder={Copy.reasonPlaceholder}
        maxLength={120}
        value={reason}
        onChange={setReason}
      />
      <FormActions pending={pending} disabled={!fromDay || !toDay} onCancel={onCancel} />
    </form>
  );
}

function KindSwitch({
  kind,
  onChange,
}: Readonly<{ kind: TimeOffKind; onChange: (kind: TimeOffKind) => void }>) {
  const options = [
    { value: TimeOffKind.block, label: Copy.kindBlock },
    { value: TimeOffKind.vacation, label: Copy.kindVacation },
  ];
  return (
    <div role="group" aria-label={Copy.kind} className="flex gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={kind === option.value ? 'default' : 'outline'}
          aria-pressed={kind === option.value}
          onClick={() => {
            onChange(option.value);
          }}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

type Field = [string, (value: string) => void];

function DayFields({ from, to }: Readonly<{ from: Field; to: Field }>) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextField
        id="off-from"
        label={Copy.fromDay}
        type="date"
        required
        value={from[0]}
        onChange={from[1]}
      />
      <TextField
        id="off-to"
        label={Copy.toDay}
        type="date"
        required
        min={from[0]}
        value={to[0]}
        onChange={to[1]}
      />
    </div>
  );
}

function TimeFields({ from, to }: Readonly<{ from: Field; to: Field }>) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextField
        id="off-from-time"
        label={Copy.fromTime}
        type="time"
        value={from[0]}
        onChange={from[1]}
      />
      <TextField
        id="off-to-time"
        label={Copy.toTime}
        type="time"
        value={to[0]}
        onChange={to[1]}
        hint={Copy.timesHint}
      />
    </div>
  );
}
