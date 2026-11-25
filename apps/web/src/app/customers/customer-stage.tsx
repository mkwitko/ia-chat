import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { feedback } from '../setup/feedback';
import { CardList, Note, Section } from '../screens/section';
import { dayTimeLabel } from './customer-format';
import { useSetStage } from './customers-api';
import { CustomerCopy as Copy } from './customers-copy';
import { LostReasonLabel, StageLabel } from './customers-labels';
import { SelectField } from './select-field';
import { LostReason, Stage, StageSource, type StageEntry } from './customers-types';

const NONE = '';

/** Status history, plus the only manual move: lost (with a fixed reason) and back to automatic. */
export function StageSection({
  customerId,
  stage,
  entries,
}: Readonly<{ customerId: string; stage: Stage; entries: readonly StageEntry[] }>) {
  return (
    <>
      <Section title={Copy.stageHeading}>
        {entries.length === 0 && <Note>{Copy.stageEmpty}</Note>}
        <CardList>
          {entries.map((entry) => (
            <li key={entry.id} className="grid gap-0.5 px-4 py-3">
              <span className="font-semibold">
                {entry.from
                  ? Copy.stageChange(StageLabel[entry.from], StageLabel[entry.to])
                  : `${Copy.stageFirst}: ${StageLabel[entry.to]}`}
              </span>
              <span className="text-sm text-muted-foreground">
                {entry.source === StageSource.manual ? Copy.stageManual : Copy.stageAutomatic}
                {entry.lostReason && ` · ${LostReasonLabel[entry.lostReason]}`} ·{' '}
                {dayTimeLabel(entry.at)}
              </span>
            </li>
          ))}
        </CardList>
      </Section>
      {stage === Stage.lost ? (
        <BackToAutomatic customerId={customerId} />
      ) : (
        <MarkLost customerId={customerId} />
      )}
    </>
  );
}

function BackToAutomatic({ customerId }: Readonly<{ customerId: string }>) {
  const setStage = useSetStage(customerId);
  return (
    <div className="px-4 pt-4 md:px-0">
      <Button
        variant="outline"
        disabled={setStage.isPending}
        onClick={() => {
          setStage.mutate(
            { stage: null },
            { onSuccess: () => toast.success(Copy.autoSaved), onError: feedback.onError },
          );
        }}
      >
        {Copy.backToAuto}
      </Button>
    </div>
  );
}

function LostOptions() {
  return (
    <>
      <option value={NONE}>{Copy.lostPlaceholder}</option>
      {Object.values(LostReason).map((value) => (
        <option key={value} value={value}>
          {LostReasonLabel[value]}
        </option>
      ))}
    </>
  );
}

function MarkLost({ customerId }: Readonly<{ customerId: string }>) {
  const setStage = useSetStage(customerId);
  const [reason, setReason] = useState<LostReason | typeof NONE>(NONE);
  function save() {
    if (reason === NONE) return;
    setStage.mutate(
      { stage: Stage.lost, lostReason: reason },
      { onSuccess: () => toast.success(Copy.lostSaved), onError: feedback.onError },
    );
  }
  return (
    <Section title={Copy.lostHeading}>
      <form
        className="grid gap-3 px-4 md:px-0"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <SelectField
          id="customer-lost-reason"
          label={Copy.lostReason}
          value={reason}
          onChange={(value) => {
            setReason(Object.values(LostReason).find((known) => known === value) ?? NONE);
          }}
        >
          <LostOptions />
        </SelectField>
        <Button type="submit" variant="outline" disabled={reason === NONE || setStage.isPending}>
          {Copy.markLost}
        </Button>
      </form>
    </Section>
  );
}
