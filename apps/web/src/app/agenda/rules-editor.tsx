import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { feedback } from '../setup/feedback';
import { FormActions } from '../setup/fields';
import { AvailabilityCopy as Copy } from './agenda-copy';
import { useSaveRules, type RuleWindow } from './agenda-api';
import { NEW_WINDOW, WEEK_ORDER, validWindows } from './rules-model';

/** RF-40: weekly windows, more than one per day. Saved all at once; the API replaces the set. */
export function RulesEditor({ initial }: Readonly<{ initial: RuleWindow[] }>) {
  const [rules, setRules] = useState(initial);
  const save = useSaveRules();
  const valid = validWindows(rules);
  return (
    <form
      className="grid gap-3 px-4 md:px-0"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(rules, feedback);
      }}
    >
      <ul className="divide-y rounded-xl border bg-card">
        {WEEK_ORDER.map((weekday) => (
          <WeekdayRow key={weekday} weekday={weekday} rules={rules} onChange={setRules} />
        ))}
      </ul>
      {!valid && (
        <p role="alert" className="text-sm text-danger">
          {Copy.invalidWindows}
        </p>
      )}
      <FormActions pending={save.isPending} disabled={!valid} />
    </form>
  );
}

interface RowProps {
  weekday: number;
  rules: RuleWindow[];
  onChange: (rules: RuleWindow[]) => void;
}

function WeekdayRow({ weekday, rules, onChange }: Readonly<RowProps>) {
  const name = Copy.weekdays[weekday] ?? '';
  const mine = rules.filter((rule) => rule.weekday === weekday);
  const patch = (rule: RuleWindow, change: Partial<RuleWindow>) => {
    onChange(rules.map((item) => (item === rule ? { ...item, ...change } : item)));
  };
  return (
    <li className="grid gap-2 p-4">
      <p className="font-semibold">{name}</p>
      {mine.length === 0 && <p className="text-sm text-muted-foreground">{Copy.closed}</p>}
      {mine.map((rule, index) => (
        <WindowRow
          key={`${String(index)}-${rule.start}`}
          name={name}
          rule={rule}
          onPatch={(change) => {
            patch(rule, change);
          }}
          onRemove={() => {
            onChange(rules.filter((item) => item !== rule));
          }}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        onClick={() => {
          onChange([...rules, { weekday, ...NEW_WINDOW }]);
        }}
      >
        {Copy.addWindow}
      </Button>
    </li>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: Readonly<{ label: string; value: string; onChange: (value: string) => void }>) {
  return (
    <Input
      type="time"
      aria-label={label}
      value={value}
      required
      className="w-32"
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}

interface WindowProps {
  name: string;
  rule: RuleWindow;
  onPatch: (change: Partial<RuleWindow>) => void;
  onRemove: () => void;
}

function WindowRow({ name, rule, onPatch, onRemove }: Readonly<WindowProps>) {
  return (
    <div className="flex items-center gap-2">
      <TimeInput
        label={`${name}: ${Copy.from}`}
        value={rule.start}
        onChange={(start) => {
          onPatch({ start });
        }}
      />
      <TimeInput
        label={`${name}: ${Copy.to}`}
        value={rule.end}
        onChange={(end) => {
          onPatch({ end });
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`${name}: ${Copy.removeWindow}`}
        onClick={onRemove}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}
