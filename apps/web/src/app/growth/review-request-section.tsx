import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Route } from '@/routes';
import { feedback } from '../setup/feedback';
import { CommonCopy } from '../setup/setup-copy';
import { useSaveReviewRequest, type ReviewRequestView } from './growth-api';
import { GrowthCopy, REVIEW_HOUR_OPTIONS } from './growth-copy';
import { SwitchRow } from './switch-row';

const Copy = GrowthCopy.review;

/** M-12: switch and delay; the link comes from the business profile and is shown, not typed here. */
export function ReviewRequestSection({ view }: Readonly<{ view: ReviewRequestView }>) {
  const save = useSaveReviewRequest();
  const [enabled, setEnabled] = useState(view.enabled);
  const [hours, setHours] = useState(view.delayHours);
  const changed = enabled !== view.enabled || hours !== view.delayHours;
  return (
    <form
      className="grid gap-5"
      aria-labelledby="growth-review"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ enabled, delayHours: hours }, feedback);
      }}
    >
      <h2 id="growth-review" className="text-lg">
        {Copy.heading}
      </h2>
      <LinkStatus link={view.reviewLink} />
      <SwitchRow
        id="growth-review"
        label={Copy.toggle}
        hint={Copy.toggleHint}
        checked={enabled}
        disabled={!view.reviewLink}
        onChange={setEnabled}
      />
      <HoursSelect value={hours} onChange={setHours} />
      <Button type="submit" className="justify-self-start" disabled={save.isPending || !changed}>
        {save.isPending ? CommonCopy.saving : Copy.save}
      </Button>
    </form>
  );
}

function HoursSelect({
  value,
  onChange,
}: Readonly<{ value: number; onChange: (hours: number) => void }>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="growth-review-hours">{Copy.delayLabel}</Label>
      <select
        id="growth-review-hours"
        className="h-11 w-fit rounded-lg border border-line-strong bg-card px-3 text-base"
        value={value}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
      >
        {REVIEW_HOUR_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {Copy.hours(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

function LinkStatus({ link }: Readonly<{ link: string | null }>) {
  if (!link)
    return (
      <p className="text-sm">
        {Copy.needsLink}{' '}
        <Link to={Route.profile} className="font-medium underline underline-offset-4">
          {Copy.addLink}
        </Link>
      </p>
    );
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{Copy.linkLabel}: </span>
      <span className="break-all">{link}</span>
    </p>
  );
}
