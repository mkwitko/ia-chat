import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { feedback } from '../setup/feedback';
import { AreaField } from '../setup/fields';
import { CommonCopy } from '../setup/setup-copy';
import { useSaveLeadFollowUp, type LeadFollowUpView } from './growth-api';
import { SwitchRow } from './switch-row';
import { FOLLOW_UP_DAY_OPTIONS, GrowthCopy, MAX_FOLLOW_UP_TEXT } from './growth-copy';

const Copy = GrowthCopy.followUp;

/** M-10: switch, wait and the text the owner approves; saving the form is the approval. */
export function LeadFollowUpSection({ view }: Readonly<{ view: LeadFollowUpView }>) {
  const save = useSaveLeadFollowUp();
  const [enabled, setEnabled] = useState(view.enabled);
  const [days, setDays] = useState(view.days);
  const [text, setText] = useState(view.text ?? view.defaultText);
  const approved = view.text !== null && view.text === text.trim();
  const changed = enabled !== view.enabled || days !== view.days || !approved;
  return (
    <form
      className="grid gap-5"
      aria-labelledby="growth-follow-up"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ enabled, days, text: text.trim() }, feedback);
      }}
    >
      <h2 id="growth-follow-up" className="text-lg">
        {Copy.heading}
      </h2>
      <SwitchRow
        id="growth-follow-up"
        label={Copy.toggle}
        hint={Copy.toggleHint}
        checked={enabled}
        onChange={setEnabled}
      />
      <DaysSelect value={days} onChange={setDays} />
      <ApprovedText view={view} text={text} onChange={setText} approved={approved} />
      <Button
        type="submit"
        className="justify-self-start"
        disabled={save.isPending || !text.trim() || !changed}
      >
        {save.isPending ? CommonCopy.saving : Copy.save}
      </Button>
    </form>
  );
}

function DaysSelect({
  value,
  onChange,
}: Readonly<{ value: number; onChange: (days: number) => void }>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="growth-follow-up-days">{Copy.daysLabel}</Label>
      <select
        id="growth-follow-up-days"
        className="h-11 w-fit rounded-lg border border-line-strong bg-card px-3 text-base"
        value={value}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
      >
        {FOLLOW_UP_DAY_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {Copy.days(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TextProps {
  view: LeadFollowUpView;
  text: string;
  approved: boolean;
  onChange: (text: string) => void;
}

function ApprovedText({ view, text, approved, onChange }: Readonly<TextProps>) {
  return (
    <div className="grid gap-2">
      <AreaField
        id="growth-follow-up-text"
        label={Copy.textLabel}
        hint={Copy.textHint}
        value={text}
        onChange={onChange}
        maxLength={MAX_FOLLOW_UP_TEXT}
      />
      <p className="text-sm font-medium" role="status">
        {approved ? Copy.approvedAt : Copy.notApproved}
      </p>
      {text.trim() !== view.defaultText && (
        <Button
          type="button"
          variant="ghost"
          className="justify-self-start"
          onClick={() => {
            onChange(view.defaultText);
          }}
        >
          {Copy.useDefault}
        </Button>
      )}
    </div>
  );
}
